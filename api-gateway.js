// E-commerce API Gateway - Industry Level Architecture
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Import configurations and utilities
const config = require('./src/config');
const logger = require('./src/logger');

// Import middleware
const { requestLogger, errorLogger } = require('./src/middleware/logging.middleware');
const { apiRateLimiter, authRateLimiter, readOnlyRateLimiter } = require('./src/middleware/rate-limiter.middleware');

// Import Redis and caching
const RedisClient = require('./src/redis/redis-client');
const CacheMiddleware = require('./src/middleware/cache.middleware');

// Import routes
const healthRoutes = require('./src/routes/health.routes');
const aggregationRoutes = require('./src/routes/aggregation.routes');

const app = express();

// Initialize Redis and Cache (optional - won't break if Redis is not available)
let redisClient = null;
let cacheMiddleware = null;

if (config.REDIS_ENABLED) {
  try {
    redisClient = new RedisClient(config.REDIS_URL);
    cacheMiddleware = new CacheMiddleware(redisClient);
    
    // Set cache middleware reference for health checks
    healthRoutes.setCacheMiddleware(cacheMiddleware);
    
    logger.info('🔄 Redis caching initialized');
  } catch (error) {
    logger.warn('⚠️ Redis initialization failed, continuing without caching:', error.message);
  }
} else {
  logger.info('ℹ️ Redis caching disabled');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API Gateway
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));

// Request logging middleware (before proxies)
app.use(requestLogger);

// Rate limiting middleware
app.use('/api/users/register', authRateLimiter);
app.use('/api/users/login', authRateLimiter);
app.use('/api', apiRateLimiter);

// Health check routes (no rate limiting)
app.use('/', healthRoutes);

// Aggregation routes (with caching for read operations)
if (config.CACHE_ENABLED && cacheMiddleware) {
  app.use('/api/aggregate', cacheMiddleware.cache(config.CACHE_TTL_SECONDS), aggregationRoutes);
} else {
  app.use('/api/aggregate', aggregationRoutes);
}

// Create proxy options with cache integration
const createProxyOptionsWithCache = (target, cacheMiddleware) => {
  return {
    target,
    changeOrigin: true,
    logLevel: 'debug',
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${req.path}:`, {
        error: err.message,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable',
          timestamp: new Date().toISOString()
        });
      }
    },
    onProxyReq: (proxyReq, req) => {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      logger.debug(`Proxying ${req.method} ${req.path}`, {
        requestId,
        target: proxyReq.path,
        contentType: req.headers['content-type']
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Only cache GET requests with successful responses
      if (req.method === 'GET' && proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 && cacheMiddleware) {
        const cacheKey = cacheMiddleware.generateCacheKey(req);
        
        // Collect response data
        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk;
        });
        
        proxyRes.on('end', () => {
          try {
            const jsonData = JSON.parse(body);
            // Cache the response
            cacheMiddleware.redis.set(cacheKey, jsonData, config.CACHE_TTL_SECONDS).then(() => {
              logger.info(`Cache SET: ${req.method} ${req.originalUrl}`, {
                cacheKey,
                ttl: config.CACHE_TTL_SECONDS,
                statusCode: proxyRes.statusCode
              });
            }).catch(error => {
              logger.error('Failed to cache response:', { cacheKey, error: error.message });
            });
            
            // Add cache headers
            res.set({
              'X-Cache': 'MISS',
              'X-Cache-Key': cacheKey
            });
          } catch (error) {
            logger.debug('Response not JSON, skipping cache:', { error: error.message });
          }
        });
      }
    }
  };
};

// Setup direct proxy routes with caching
if (config.CACHE_ENABLED && cacheMiddleware) {
  // Users API with caching and cache invalidation
  app.use('/api/users', 
    cacheMiddleware.cache(config.CACHE_TTL_SECONDS),
    cacheMiddleware.invalidateUserCache(),
    createProxyMiddleware(createProxyOptionsWithCache(config.USER_SERVICE_URL, cacheMiddleware))
  );

  // Products API with caching and cache invalidation
  app.use('/api/products', 
    cacheMiddleware.cache(config.CACHE_TTL_SECONDS),
    cacheMiddleware.invalidateProductCache(),
    createProxyMiddleware(createProxyOptionsWithCache(config.PRODUCT_SERVICE_URL, cacheMiddleware))
  );

  // Orders API with caching and cache invalidation
  app.use('/api/orders', 
    cacheMiddleware.cache(config.CACHE_TTL_SECONDS),
    cacheMiddleware.invalidateOrderCache(),
    createProxyMiddleware(createProxyOptionsWithCache(config.ORDER_SERVICE_URL, cacheMiddleware))
  );

  // Inventory API with caching and cache invalidation
  app.use('/api/inventory', 
    cacheMiddleware.cache(config.CACHE_TTL_SECONDS),
    cacheMiddleware.invalidateInventoryCache(),
    createProxyMiddleware(createProxyOptionsWithCache(config.INVENTORY_SERVICE_URL, cacheMiddleware))
  );

  logger.info('✅ API routes configured with Redis caching');
} else {
  // Fallback without caching - use simple proxy options
  const simpleProxyOptions = {
    changeOrigin: true,
    logLevel: 'debug',
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${req.path}:`, {
        error: err.message,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable',
          timestamp: new Date().toISOString()
        });
      }
    },
    onProxyReq: (proxyReq, req) => {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      logger.debug(`Proxying ${req.method} ${req.path}`, {
        requestId,
        target: proxyReq.path,
        contentType: req.headers['content-type']
      });
    }
  };

  app.use('/api/users', createProxyMiddleware({
    target: config.USER_SERVICE_URL,
    ...simpleProxyOptions
  }));

  app.use('/api/products', createProxyMiddleware({
    target: config.PRODUCT_SERVICE_URL,
    ...simpleProxyOptions
  }));

  app.use('/api/orders', createProxyMiddleware({
    target: config.ORDER_SERVICE_URL,
    ...simpleProxyOptions
  }));

  app.use('/api/inventory', createProxyMiddleware({
    target: config.INVENTORY_SERVICE_URL,
    ...simpleProxyOptions
  }));

  logger.info('ℹ️ API routes configured without caching');
}

// Health check proxies (no caching needed for health checks)
const healthProxyOptions = {
  changeOrigin: true,
  logLevel: 'debug'
};

app.use('/health/users', createProxyMiddleware({
  target: config.USER_SERVICE_URL + '/health',
  ...healthProxyOptions
}));

app.use('/health/products', createProxyMiddleware({
  target: config.PRODUCT_SERVICE_URL + '/health',
  ...healthProxyOptions
}));

app.use('/health/orders', createProxyMiddleware({
  target: config.ORDER_SERVICE_URL + '/health',
  ...healthProxyOptions
}));

app.use('/health/inventory', createProxyMiddleware({
  target: config.INVENTORY_SERVICE_URL + '/health',
  ...healthProxyOptions
}));

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, { ip: req.ip });
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_endpoints: [
      '/api/users',
      '/api/products', 
      '/api/orders',
      '/api/inventory'
    ],
    health_checks: [
      '/health/users',
      '/health/products',
      '/health/orders', 
      '/health/inventory'
    ]
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Close Redis connection if it exists
  if (redisClient) {
    try {
      await redisClient.closeConnection();
      logger.info('✅ Redis connection closed');
    } catch (error) {
      logger.error('❌ Error closing Redis connection:', error);
    }
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(config.PORT, () => {
  logger.info(`🚀 E-commerce API Gateway started successfully`);
  logger.info(`📍 Server running on http://localhost:${config.PORT}`);
  logger.info(`🌍 Environment: ${config.NODE_ENV}`);
  logger.info(`📊 Log Level: ${config.LOG_LEVEL}`);
  logger.info('📍 Available services:');
  logger.info(`   • User Service: http://localhost:${config.PORT}/api/users`);
  logger.info(`   • Product Service: http://localhost:${config.PORT}/api/products`);
  logger.info(`   • Order Service: http://localhost:${config.PORT}/api/orders`);
  logger.info(`   • Inventory Service: http://localhost:${config.PORT}/api/inventory`);
  logger.info('🏥 Health checks:');
  logger.info(`   • Gateway Health: http://localhost:${config.PORT}/`);
  logger.info(`   • System Health: http://localhost:${config.PORT}/system`);
});
