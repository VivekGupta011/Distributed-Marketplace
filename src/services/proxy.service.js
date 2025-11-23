// Service proxy configuration and management
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const logger = require('../logger');

class ServiceProxy {
  static serviceConfigs = [
    {
      path: '/api/users',
      url: config.USER_SERVICE_URL,
      pathRewrite: { '^/api/users': '/api/users' },
      name: 'user-service',
      timeout: 30000,
    },
    {
      path: '/api/products',
      url: config.PRODUCT_SERVICE_URL,
      pathRewrite: { '^/api/products': '/api/products' },
      name: 'product-service',
      timeout: 30000,
    },
    {
      path: '/api/orders',
      url: config.ORDER_SERVICE_URL,
      pathRewrite: { '^/api/orders': '/api/orders' },
      name: 'order-service',
      timeout: 30000,
    },
    {
      path: '/api/inventory',
      url: config.INVENTORY_SERVICE_URL,
      pathRewrite: { '^/api/inventory': '/api/inventory' },
      name: 'inventory-service',
      timeout: 30000,
    },
  ];

  static healthCheckConfigs = [
    {
      path: '/health/users',
      url: config.USER_SERVICE_URL,
      pathRewrite: { '^/health/users': '/health' },
      name: 'user-service-health',
    },
    {
      path: '/health/products',
      url: config.PRODUCT_SERVICE_URL,
      pathRewrite: { '^/health/products': '/health' },
      name: 'product-service-health',
    },
    {
      path: '/health/orders',
      url: config.ORDER_SERVICE_URL,
      pathRewrite: { '^/health/orders': '/health' },
      name: 'order-service-health',
    },
    {
      path: '/health/inventory',
      url: config.INVENTORY_SERVICE_URL,
      pathRewrite: { '^/health/inventory': '/health' },
      name: 'inventory-service-health',
    },
  ];

  static createProxyOptions(service) {
    return {
      target: service.url,
      changeOrigin: true,
      pathRewrite: service.pathRewrite,
      timeout: service.timeout || config.DEFAULT_TIMEOUT,
      logLevel: 'debug',
      onError: ServiceProxy.handleProxyError,
      onProxyReq: ServiceProxy.handleProxyRequest,
      onProxyRes: ServiceProxy.handleProxyResponse,
    };
  }

  static handleProxyError(err, req, res) {
    logger.error(`Proxy error for ${req.path}:`, {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    const errorResponse = {
      success: false,
      message: 'Service temporarily unavailable',
      timestamp: new Date().toISOString(),
      path: req.path
    };

    if (!res.headersSent) {
      res
        .status(503)
        .setHeader('Content-Type', 'application/json')
        .json(errorResponse);
    }
  }

  static handleProxyRequest(proxyReq, req) {
    // Add request ID for tracing
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    proxyReq.setHeader('x-request-id', requestId);
    
    // Handle parsed body for POST/PUT requests
    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
    
    logger.debug(`Proxying request ${requestId} to ${req.path}`, {
      method: req.method,
      url: req.url,
      target: proxyReq.path,
      contentType: req.headers['content-type'],
      hasBody: !!(req.body && Object.keys(req.body).length > 0)
    });
  }

  static handleProxyResponse(proxyRes, req) {
    const requestId = req.headers['x-request-id'];
    
    logger.debug(`Received response for ${requestId}`, {
      statusCode: proxyRes.statusCode,
      path: req.path
    });
  }

  static setupProxy(app) {
    // Setup main service proxies
    ServiceProxy.serviceConfigs.forEach((service) => {
      const proxyOptions = ServiceProxy.createProxyOptions(service);
      app.use(service.path, createProxyMiddleware(proxyOptions));
      logger.info(`Configured proxy for ${service.name} at ${service.path} -> ${service.url}`);
    });

    // Setup health check proxies
    ServiceProxy.healthCheckConfigs.forEach((service) => {
      const proxyOptions = ServiceProxy.createProxyOptions(service);
      app.use(service.path, createProxyMiddleware(proxyOptions));
      logger.info(`Configured health check proxy for ${service.name} at ${service.path}`);
    });
  }
}

module.exports = ServiceProxy;
