// Caching middleware for API Gateway
const logger = require('../logger');

class CacheMiddleware {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  // Generate cache key from request
  generateCacheKey(req) {
    const { method, query } = req;
    // Use originalUrl to get the full path including mounted routes
    const fullPath = req.originalUrl.split('?')[0]; // Remove query params from URL
    const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : '{}';
    return `api_cache:${method}:${fullPath}:${queryString}`;
  }

  // Cache middleware for GET requests only
  cache(ttlSeconds = 300) {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching if Redis is not ready
      if (!this.redis || !this.redis.isReady()) {
        logger.debug('Redis not available, skipping cache');
        return next();
      }

      const cacheKey = this.generateCacheKey(req);
      
      logger.debug(`Cache middleware called for: ${req.method} ${req.originalUrl}`, {
        cacheKey,
        redisReady: this.redis.isReady()
      });

      try {
        // Try to get cached response
        const cachedResponse = await this.redis.get(cacheKey);
        
        if (cachedResponse) {
          logger.info(`Cache HIT: ${req.method} ${req.originalUrl}`, {
            cacheKey,
            ip: req.ip
          });

          // Add cache headers
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'Content-Type': 'application/json'
          });

          return res.json(cachedResponse);
        }

        // Cache miss - intercept response to cache it
        logger.debug(`Cache MISS: ${req.method} ${req.originalUrl}`, { cacheKey });

        // Store original res.json method
        const originalJson = res.json.bind(res);

        // Override res.json to cache the response
        res.json = (data) => {
          // Only cache successful responses (2xx status codes)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Cache the response asynchronously (don't wait)
            this.redis.set(cacheKey, data, ttlSeconds).catch(error => {
              logger.error('Failed to cache response:', { cacheKey, error: error.message });
            });

            logger.info(`Cache SET: ${req.method} ${req.originalUrl}`, {
              cacheKey,
              ttl: ttlSeconds,
              statusCode: res.statusCode
            });
          }

          // Add cache headers
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey
          });

          // Call original json method
          return originalJson(data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', {
          error: error.message,
          cacheKey,
          path: req.path
        });
        // Continue without caching on error
        next();
      }
    };
  }

  // Invalidate cache for specific patterns
  invalidatePattern(pattern) {
    return async (req, res, next) => {
      // Only invalidate on write operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        // Store original res.json method
        const originalJson = res.json.bind(res);

        // Override res.json to invalidate cache after successful response
        res.json = async (data) => {
          // Only invalidate on successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              await this.redis.flushPattern(pattern);
              logger.info(`Cache invalidated for pattern: ${pattern}`, {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode
              });
            } catch (error) {
              logger.error('Cache invalidation error:', {
                pattern,
                error: error.message
              });
            }
          }

          // Call original json method
          return originalJson(data);
        };
      }

      next();
    };
  }

  // Cache invalidation for specific services
  invalidateUserCache() {
    return this.invalidatePattern('api_cache:*:/api/users*');
  }

  invalidateProductCache() {
    return this.invalidatePattern('api_cache:*:/api/products*');
  }

  invalidateOrderCache() {
    return this.invalidatePattern('api_cache:*:/api/orders*');
  }

  invalidateInventoryCache() {
    return this.invalidatePattern('api_cache:*:/api/inventory*');
  }

  // Health check for cache
  async healthCheck() {
    if (!this.redis) {
      return { status: 'disabled', message: 'Redis client not initialized' };
    }

    if (!this.redis.isReady()) {
      return { status: 'disconnected', message: 'Redis not connected' };
    }

    try {
      const pingResult = await this.redis.ping();
      if (pingResult) {
        return { status: 'healthy', message: 'Redis is responding' };
      } else {
        return { status: 'unhealthy', message: 'Redis ping failed' };
      }
    } catch (error) {
      return { 
        status: 'error', 
        message: 'Redis health check failed',
        error: error.message 
      };
    }
  }
}

module.exports = CacheMiddleware;
