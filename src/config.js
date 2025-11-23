// Configuration management for the API Gateway
require('dotenv').config();

const config = {
  // Server configuration
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Service URLs
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:4001',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4002',
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://localhost:4003',
  INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4004',
  
  // Proxy configuration
  DEFAULT_TIMEOUT: parseInt(process.env.DEFAULT_TIMEOUT) || 30000,
  
  // Rate limiting (for future use)
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Redis configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_ENABLED: process.env.REDIS_ENABLED === 'true' || false,
  
  // Cache configuration
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutes default
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true' || false,
};

module.exports = config;
