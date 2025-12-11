const express = require('express');
const axios = require('axios');
const Order = require('../models/Order');
const orderEventService = require('../services/orderEventService');

const router = express.Router();

// Helper function to calculate order totals
const calculateOrderTotals = (items, shippingCost = 50, taxRate = 0.18) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + shippingCost + tax;
  
  return {
    subtotal,
    shippingCost,
    tax: Math.round(tax * 100) / 100,
    discount: 0,
    total: Math.round(total * 100) / 100
  };
};

// Helper function to verify product availability
const verifyProductAvailability = async (items) => {
  try {
    for (const item of items) {
      const response = await axios.get(`${process.env.PRODUCT_SERVICE_URL}/api/products/${item.productId}`);
      const product = response.data.data.product;
      
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }
      
      // Update item with current product details
      item.productName = product.name;
      item.productPrice = product.price;
      item.subtotal = product.price * item.quantity;
    }
    return true;
  } catch (error) {
    throw error;
  }
};

// @route   POST /api/orders
// @desc    Create new order
// @access  Public (In real app, this would require authentication)
router.post('/', async (req, res) => {
  try {
    const { userId, userEmail, items, shippingAddress, paymentMethod } = req.body;

    // Validate required fields
    if (!userId || !userEmail || !items || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify product availability and update prices
    await verifyProductAvailability(items);

    // Calculate order totals
    const orderSummary = calculateOrderTotals(items);

    // Create order
    const order = new Order({
      userId,
      userEmail,
      items,
      shippingAddress,
      orderSummary,
      paymentMethod: paymentMethod || 'cash_on_delivery'
    });

    await order.save();

    // Publish order created event
    await orderEventService.publishOrderCreated(order);

    // TODO: In a real application, you would:
    // 1. Reserve inventory
    // 2. Process payment
    // 3. Update product stock

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/orders
// @desc    Get all orders with pagination
// @access  Public (In real app, this would be admin only)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Public (In real app, this would require authentication)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/orders/number/:orderNumber
// @desc    Get order by order number
// @access  Public
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/orders/user/:userId
// @desc    Get orders by user ID
// @access  Public (In real app, this would require authentication)
router.get('/user/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ userId: req.params.userId });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Public (In real app, this would be admin only)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, trackingNumber, estimatedDelivery, notes } = req.body;
    
    // Get the current order to track previous status
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = currentOrder.status;
    
    const updateData = { status };
    
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
    if (notes) updateData.notes = notes;
    
    // Set delivered date if status is delivered
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Publish order status updated event
    await orderEventService.publishOrderStatusUpdated(order, previousStatus);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/orders/:id/payment
// @desc    Update payment status
// @access  Public (In real app, this would be payment service)
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    // Get the current order to track previous payment status
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousPaymentStatus = currentOrder.paymentStatus;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );

    // If payment is successful, update order status to confirmed
    if (paymentStatus === 'paid' && order.status === 'pending') {
      order.status = 'confirmed';
      await order.save();
    }

    // Publish payment status updated event
    await orderEventService.publishPaymentStatusUpdated(order, previousPaymentStatus);

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order
// @access  Public (In real app, this would require authentication)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that has been shipped or delivered'
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Publish order cancelled event
    await orderEventService.publishOrderCancelled(order);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/orders/stats/summary
// @desc    Get order statistics
// @access  Public (In real app, this would be admin only)
router.get('/stats/summary', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    
    // Calculate total revenue from delivered orders
    const revenueResult = await Order.aggregate([
      { $match: { status: 'delivered', paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$orderSummary.total' } } }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
