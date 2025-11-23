// Aggregation Routes for API Gateway
const express = require('express');
const AggregationService = require('../services/aggregation.service');
const logger = require('../logger');

const router = express.Router();
const aggregationService = new AggregationService();

// @route   GET /api/aggregate/dashboard
// @desc    Get dashboard overview from all services
// @access  Public
router.get('/dashboard', async (req, res) => {
  try {
    logger.info('Dashboard aggregation requested', { ip: req.ip });
    
    const dashboard = await aggregationService.getDashboardOverview();
    
    res.json({
      success: true,
      message: 'Dashboard data aggregated successfully',
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Dashboard aggregation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate dashboard data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/user/:userId
// @desc    Get user profile with related data
// @access  Private
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    logger.info('User profile aggregation requested', { userId, ip: req.ip });
    
    const profile = await aggregationService.getUserProfile(userId, token);
    
    res.json({
      success: true,
      message: 'User profile aggregated successfully',
      data: profile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('User profile aggregation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate user profile',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/product/:productId
// @desc    Get product details with inventory and stats
// @access  Public
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    logger.info('Product details aggregation requested', { productId, ip: req.ip });
    
    const productDetails = await aggregationService.getProductDetails(productId);
    
    res.json({
      success: true,
      message: 'Product details aggregated successfully',
      data: productDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Product details aggregation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate product details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/order/:orderId
// @desc    Get order details with user and product info
// @access  Private
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    logger.info('Order details aggregation requested', { orderId, ip: req.ip });
    
    const orderDetails = await aggregationService.getOrderDetails(orderId, token);
    
    res.json({
      success: true,
      message: 'Order details aggregated successfully',
      data: orderDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Order details aggregation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate order details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/analytics
// @desc    Get analytics from all services
// @access  Private (Admin)
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    logger.info('Analytics aggregation requested', { timeframe, ip: req.ip });
    
    const analytics = await aggregationService.getAnalytics(timeframe);
    
    res.json({
      success: true,
      message: 'Analytics data aggregated successfully',
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analytics aggregation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate analytics data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/search
// @desc    Search across all services
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info('Cross-service search requested', { query, ip: req.ip });
    
    const searchResults = await aggregationService.searchAll(query);
    
    res.json({
      success: true,
      message: 'Search completed across all services',
      data: searchResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cross-service search failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to perform cross-service search',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/health
// @desc    Get health status of all services
// @access  Public
router.get('/health', async (req, res) => {
  try {
    logger.info('Services health check requested', { ip: req.ip });
    
    const health = await aggregationService.getServicesHealth();
    
    // Set appropriate status code based on overall health
    let statusCode = 200;
    if (health.overall === 'degraded') {
      statusCode = 207; // Multi-Status
    } else if (health.overall === 'critical') {
      statusCode = 503; // Service Unavailable
    }
    
    res.status(statusCode).json({
      success: health.overall !== 'critical',
      message: `Services are ${health.overall}`,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Services health check failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to check services health',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/aggregate/stats/summary
// @desc    Get quick summary stats from all services
// @access  Public
router.get('/stats/summary', async (req, res) => {
  try {
    logger.info('Summary stats aggregation requested', { ip: req.ip });
    
    const dashboard = await aggregationService.getDashboardOverview();
    
    res.json({
      success: true,
      message: 'Summary stats aggregated successfully',
      data: {
        summary: dashboard.summary,
        servicesStatus: Object.keys(dashboard.services).reduce((acc, service) => {
          acc[service] = dashboard.services[service].status;
          return acc;
        }, {}),
        timestamp: dashboard.timestamp
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Summary stats aggregation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate summary stats',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
