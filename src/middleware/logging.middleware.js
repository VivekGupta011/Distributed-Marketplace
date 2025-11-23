// Request logging middleware
const logger = require('../logger');

// Morgan-like request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.http(`${req.method} ${req.url} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Determine log level based on status code
    let logLevel = 'info';
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'warn';
    } else if (statusCode >= 500) {
      logLevel = 'error';
    }
    
    logger[logLevel](`${req.method} ${req.url} ${statusCode} - ${duration}ms - ${req.ip}`);
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error(`Error in ${req.method} ${req.url}: ${err.message}`, {
    error: err.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
