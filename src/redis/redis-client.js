// Redis client for caching in the API Gateway
const Redis = require('ioredis');
const logger = require('../logger');

class RedisClient {
  constructor(redisUrl, options = {}) {
    this.redisUrl = redisUrl;
    this.isConnected = false;
    
    // Default options with retry strategy
    this.options = {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.info(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately
      ...options
    };

    this.instance = null;
    this.initializeConnection();
  }

  initializeConnection() {
    try {
      logger.info(`Attempting to connect to Redis at: ${this.redisUrl}`);
      this.instance = new Redis(this.redisUrl, this.options);
      this.setupEventListeners();
      
      // Immediately try to connect
      this.instance.connect().catch(error => {
        logger.error('Redis connection failed during initialization:', error.message);
      });
    } catch (error) {
      logger.error('Failed to initialize Redis connection:', error);
      this.instance = null;
    }
  }

  setupEventListeners() {
    if (!this.instance) return;

    this.instance.on('connect', () => {
      this.isConnected = true;
      logger.info('✅ Connected to Redis successfully');
    });

    this.instance.on('error', (error) => {
      this.isConnected = false;
      logger.error('❌ Redis connection error:', {
        error: error.message,
        code: error.code
      });
    });

    this.instance.on('close', () => {
      this.isConnected = false;
      logger.warn('⚠️ Redis connection closed');
    });

    this.instance.on('reconnecting', (delay) => {
      logger.info(`🔄 Reconnecting to Redis in ${delay}ms...`);
    });

    this.instance.on('ready', () => {
      this.isConnected = true;
      logger.info('🚀 Redis is ready for operations');
    });
  }

  getInstance() {
    return this.instance;
  }

  isReady() {
    return this.isConnected && this.instance && this.instance.status === 'ready';
  }

  async get(key) {
    if (!this.isReady()) {
      logger.debug('Redis not ready, skipping GET operation');
      return null;
    }

    try {
      const result = await this.instance.get(key);
      if (result) {
        logger.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(result);
      }
      logger.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error('Redis GET error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isReady()) {
      logger.debug('Redis not ready, skipping SET operation');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.instance.setex(key, ttlSeconds, serializedValue);
      logger.debug(`Cache SET for key: ${key}, TTL: ${ttlSeconds}s`);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.isReady()) {
      logger.debug('Redis not ready, skipping DEL operation');
      return false;
    }

    try {
      await this.instance.del(key);
      logger.debug(`Cache DEL for key: ${key}`);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', { key, error: error.message });
      return false;
    }
  }

  async flushPattern(pattern) {
    if (!this.isReady()) {
      logger.debug('Redis not ready, skipping FLUSH operation');
      return false;
    }

    try {
      const keys = await this.instance.keys(pattern);
      if (keys.length > 0) {
        await this.instance.del(...keys);
        logger.debug(`Cache FLUSH for pattern: ${pattern}, deleted ${keys.length} keys`);
      }
      return true;
    } catch (error) {
      logger.error('Redis FLUSH error:', { pattern, error: error.message });
      return false;
    }
  }

  async closeConnection() {
    if (this.instance) {
      try {
        await this.instance.quit();
        this.isConnected = false;
        logger.info('✅ Redis connection closed gracefully');
      } catch (error) {
        logger.error('❌ Error closing Redis connection:', error);
      }
    }
  }

  // Health check method
  async ping() {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.instance.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING error:', error);
      return false;
    }
  }
}

module.exports = RedisClient;
