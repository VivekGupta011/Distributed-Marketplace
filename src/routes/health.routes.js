// Health check routes for the API Gateway
const express = require('express');
const config = require('../config');
const logger = require('../logger');

const router = express.Router();

// This will be set by the main app
let cacheMiddleware = null;

// Function to set cache middleware reference
const setCacheMiddleware = (middleware) => {
  cacheMiddleware = middleware;
};

router.setCacheMiddleware = setCacheMiddleware;

// API Gateway health check
router.get('/', async (req, res) => {
  const healthData = {
    success: true,
    message: 'E-commerce API Gateway is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV,
    uptime: process.uptime(),
    features: {
      caching: config.CACHE_ENABLED,
      redis: config.REDIS_ENABLED,
      rateLimiting: true
    },
    services: {
      user: `http://localhost:${config.PORT}/api/users`,
      product: `http://localhost:${config.PORT}/api/products`,
      order: `http://localhost:${config.PORT}/api/orders`,
      inventory: `http://localhost:${config.PORT}/api/inventory`
    },
    healthChecks: {
      user: `http://localhost:${config.PORT}/health/users`,
      product: `http://localhost:${config.PORT}/health/products`,
      order: `http://localhost:${config.PORT}/health/orders`,
      inventory: `http://localhost:${config.PORT}/health/inventory`
    }
  };

  // Add Redis health if caching is enabled
  if (config.CACHE_ENABLED && cacheMiddleware) {
    try {
      const cacheHealth = await cacheMiddleware.healthCheck();
      healthData.cache = cacheHealth;
    } catch (error) {
      healthData.cache = { 
        status: 'error', 
        message: 'Cache health check failed',
        error: error.message 
      };
    }
  }

  logger.info('Health check requested', { ip: req.ip });
  res.json(healthData);
});

// Detailed system health
router.get('/system', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  const systemHealth = {
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    }
  };

  res.json(systemHealth);
});

module.exports = router;
