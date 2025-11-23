// Rate limiting middleware for the API Gateway
const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../logger');

// Create rate limiter for general API endpoints
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path.startsWith('/health');
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Strict rate limiter for authentication endpoints
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  }
});

// General API rate limiter
const apiRateLimiter = createRateLimiter({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS
});

// Lenient rate limiter for read operations
const readOnlyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for read operations
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: 900
  }
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  readOnlyRateLimiter
};
