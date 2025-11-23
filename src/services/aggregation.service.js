// Data Aggregation Service for E-commerce Microservices
const axios = require('axios');
const config = require('../config');
const logger = require('../logger');

class AggregationService {
  constructor() {
    this.services = {
      user: config.USER_SERVICE_URL,
      product: config.PRODUCT_SERVICE_URL,
      order: config.ORDER_SERVICE_URL,
      inventory: config.INVENTORY_SERVICE_URL
    };
    
    // Default timeout for service calls
    this.timeout = 5000;
  }

  // Helper method to make service calls with error handling
  async callService(serviceName, endpoint, options = {}) {
    try {
      const baseURL = this.services[serviceName];
      if (!baseURL) {
        throw new Error(`Service ${serviceName} not configured`);
      }

      const response = await axios({
        method: 'GET',
        url: `${baseURL}${endpoint}`,
        timeout: this.timeout,
        ...options
      });

      return {
        success: true,
        data: response.data,
        service: serviceName
      };
    } catch (error) {
      logger.error(`Failed to call ${serviceName} service:`, {
        endpoint,
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message,
        service: serviceName,
        status: error.response?.status || 500
      };
    }
  }

  // Get dashboard overview data from all services
  async getDashboardOverview() {
    logger.info('Aggregating dashboard overview data');

    const promises = [
      this.callService('user', '/api/users/stats'),
      this.callService('product', '/api/products/stats'),
      this.callService('order', '/api/orders/stats/summary'),
      this.callService('inventory', '/api/inventory/stats/summary')
    ];

    const results = await Promise.allSettled(promises);
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      services: {},
      summary: {}
    };

    // Process results
    results.forEach((result, index) => {
      const serviceNames = ['user', 'product', 'order', 'inventory'];
      const serviceName = serviceNames[index];

      if (result.status === 'fulfilled' && result.value.success) {
        dashboard.services[serviceName] = {
          status: 'healthy',
          data: result.value.data
        };
      } else {
        dashboard.services[serviceName] = {
          status: 'error',
          error: result.reason?.message || result.value?.error || 'Unknown error'
        };
      }
    });

    // Create summary from available data
    dashboard.summary = this.createDashboardSummary(dashboard.services);

    return dashboard;
  }

  // Get user profile with related data (orders, etc.)
  async getUserProfile(userId, token) {
    logger.info(`Aggregating user profile data for user: ${userId}`);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const promises = [
      this.callService('user', `/api/users/profile`, { headers }),
      this.callService('order', `/api/orders/user/${userId}`, { headers }),
      this.callService('order', `/api/orders/user/${userId}/stats`, { headers })
    ];

    const [userResult, ordersResult, orderStatsResult] = await Promise.allSettled(promises);

    return {
      timestamp: new Date().toISOString(),
      userId,
      profile: userResult.status === 'fulfilled' ? userResult.value : null,
      orders: ordersResult.status === 'fulfilled' ? ordersResult.value : null,
      orderStats: orderStatsResult.status === 'fulfilled' ? orderStatsResult.value : null
    };
  }

  // Get product details with inventory and order history
  async getProductDetails(productId) {
    logger.info(`Aggregating product details for product: ${productId}`);

    const promises = [
      this.callService('product', `/api/products/${productId}`),
      this.callService('inventory', `/api/inventory/${productId}`),
      this.callService('inventory', `/api/inventory/${productId}/movements`),
      this.callService('order', `/api/orders/product/${productId}/stats`)
    ];

    const [productResult, inventoryResult, movementsResult, orderStatsResult] = 
      await Promise.allSettled(promises);

    return {
      timestamp: new Date().toISOString(),
      productId,
      product: productResult.status === 'fulfilled' ? productResult.value : null,
      inventory: inventoryResult.status === 'fulfilled' ? inventoryResult.value : null,
      movements: movementsResult.status === 'fulfilled' ? movementsResult.value : null,
      orderStats: orderStatsResult.status === 'fulfilled' ? orderStatsResult.value : null
    };
  }

  // Get order details with user and product information
  async getOrderDetails(orderId, token) {
    logger.info(`Aggregating order details for order: ${orderId}`);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // First get the order
    const orderResult = await this.callService('order', `/api/orders/${orderId}`, { headers });
    
    if (!orderResult.success) {
      return {
        timestamp: new Date().toISOString(),
        orderId,
        error: 'Order not found',
        order: null
      };
    }

    const order = orderResult.data.data?.order;
    if (!order) {
      return {
        timestamp: new Date().toISOString(),
        orderId,
        error: 'Invalid order data',
        order: orderResult.data
      };
    }

    // Get related data
    const promises = [
      this.callService('user', `/api/users/${order.userId}`, { headers })
    ];

    // Get product details for each item
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        promises.push(
          this.callService('product', `/api/products/${item.productId}`),
          this.callService('inventory', `/api/inventory/${item.productId}`)
        );
      });
    }

    const results = await Promise.allSettled(promises);

    return {
      timestamp: new Date().toISOString(),
      orderId,
      order: orderResult.data,
      user: results[0]?.status === 'fulfilled' ? results[0].value : null,
      productDetails: results.slice(1).filter((_, index) => index % 2 === 0),
      inventoryDetails: results.slice(1).filter((_, index) => index % 2 === 1)
    };
  }

  // Get comprehensive analytics data
  async getAnalytics(timeframe = '30d') {
    logger.info(`Aggregating analytics data for timeframe: ${timeframe}`);

    const promises = [
      this.callService('order', `/api/orders/analytics?timeframe=${timeframe}`),
      this.callService('product', `/api/products/analytics?timeframe=${timeframe}`),
      this.callService('user', `/api/users/analytics?timeframe=${timeframe}`),
      this.callService('inventory', `/api/inventory/analytics?timeframe=${timeframe}`)
    ];

    const results = await Promise.allSettled(promises);
    
    return {
      timestamp: new Date().toISOString(),
      timeframe,
      analytics: {
        orders: results[0]?.status === 'fulfilled' ? results[0].value : null,
        products: results[1]?.status === 'fulfilled' ? results[1].value : null,
        users: results[2]?.status === 'fulfilled' ? results[2].value : null,
        inventory: results[3]?.status === 'fulfilled' ? results[3].value : null
      }
    };
  }

  // Search across all services
  async searchAll(query, filters = {}) {
    logger.info(`Performing cross-service search for: ${query}`);

    const promises = [
      this.callService('product', `/api/products/search?q=${encodeURIComponent(query)}`),
      this.callService('user', `/api/users/search?q=${encodeURIComponent(query)}`),
      this.callService('order', `/api/orders/search?q=${encodeURIComponent(query)}`)
    ];

    const results = await Promise.allSettled(promises);

    return {
      timestamp: new Date().toISOString(),
      query,
      results: {
        products: results[0]?.status === 'fulfilled' ? results[0].value : null,
        users: results[1]?.status === 'fulfilled' ? results[1].value : null,
        orders: results[2]?.status === 'fulfilled' ? results[2].value : null
      }
    };
  }

  // Health check for all services
  async getServicesHealth() {
    logger.info('Checking health of all services');

    const promises = [
      this.callService('user', '/health'),
      this.callService('product', '/health'),
      this.callService('order', '/health'),
      this.callService('inventory', '/health')
    ];

    const results = await Promise.allSettled(promises);
    const serviceNames = ['user', 'product', 'order', 'inventory'];

    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {}
    };

    let healthyCount = 0;

    results.forEach((result, index) => {
      const serviceName = serviceNames[index];
      
      if (result.status === 'fulfilled' && result.value.success) {
        health.services[serviceName] = {
          status: 'healthy',
          responseTime: 'fast',
          data: result.value.data
        };
        healthyCount++;
      } else {
        health.services[serviceName] = {
          status: 'unhealthy',
          error: result.reason?.message || result.value?.error || 'Service unavailable'
        };
      }
    });

    // Determine overall health
    if (healthyCount === 0) {
      health.overall = 'critical';
    } else if (healthyCount < serviceNames.length) {
      health.overall = 'degraded';
    }

    return health;
  }

  // Helper method to create dashboard summary
  createDashboardSummary(services) {
    const summary = {
      totalUsers: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      lowStockItems: 0,
      servicesHealthy: 0,
      servicesTotal: 4
    };

    // Extract data from each service
    if (services.user?.status === 'healthy') {
      summary.totalUsers = services.user.data?.data?.totalUsers || 0;
      summary.servicesHealthy++;
    }

    if (services.product?.status === 'healthy') {
      summary.totalProducts = services.product.data?.data?.totalProducts || 0;
      summary.servicesHealthy++;
    }

    if (services.order?.status === 'healthy') {
      const orderData = services.order.data?.data;
      summary.totalOrders = orderData?.totalOrders || 0;
      summary.totalRevenue = orderData?.totalRevenue || 0;
      summary.servicesHealthy++;
    }

    if (services.inventory?.status === 'healthy') {
      summary.lowStockItems = services.inventory.data?.data?.lowStockCount || 0;
      summary.servicesHealthy++;
    }

    return summary;
  }
}

module.exports = AggregationService;
