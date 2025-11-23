const express = require('express');
const axios = require('axios');
const Inventory = require('../models/Inventory');

const router = express.Router();

// Helper function to add inventory movement
const addMovement = (inventory, type, quantity, reason, reference = null, performedBy = 'system') => {
  inventory.movements.push({
    type,
    quantity,
    reason,
    reference,
    performedBy
  });
};

// @route   GET /api/inventory
// @desc    Get all inventory items with pagination
// @access  Public (In real app, this would be admin only)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.lowStock === 'true') {
      filter.$expr = { $lte: ['$availableStock', '$reorderLevel'] };
    }
    
    if (req.query.outOfStock === 'true') {
      filter.availableStock = { $lte: 0 };
    }
    
    if (req.query.warehouse) {
      filter['location.warehouse'] = req.query.warehouse;
    }

    const inventory = await Inventory.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(filter);

    res.json({
      success: true,
      data: {
        inventory,
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

// @route   GET /api/inventory/:productId
// @desc    Get inventory for specific product
// @access  Public
router.get('/:productId', async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ 
      productId: req.params.productId,
      isActive: true 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }

    res.json({
      success: true,
      data: {
        inventory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/inventory
// @desc    Create new inventory record
// @access  Public (In real app, this would be admin only)
router.post('/', async (req, res) => {
  try {
    const { productId, productName, sku, currentStock, reorderLevel, maxStock, location, supplier, costPrice } = req.body;

    // Check if inventory already exists for this product
    const existingInventory = await Inventory.findOne({ productId });
    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: 'Inventory record already exists for this product'
      });
    }

    const inventory = new Inventory({
      productId,
      productName,
      sku,
      currentStock: currentStock || 0,
      reorderLevel,
      maxStock,
      location,
      supplier,
      costPrice
    });

    // Add initial stock movement if stock > 0
    if (currentStock > 0) {
      addMovement(inventory, 'in', currentStock, 'Initial stock', null, 'admin');
      inventory.lastRestocked = new Date();
    }

    await inventory.save();

    res.status(201).json({
      success: true,
      message: 'Inventory record created successfully',
      data: {
        inventory
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/inventory/:productId/stock
// @desc    Update stock levels
// @access  Public (In real app, this would be admin only)
router.put('/:productId/stock', async (req, res) => {
  try {
    const { quantity, type, reason, reference, performedBy } = req.body;

    if (!quantity || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Quantity, type, and reason are required'
      });
    }

    const inventory = await Inventory.findOne({ 
      productId: req.params.productId,
      isActive: true 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }

    // Update stock based on movement type
    switch (type) {
      case 'in':
        inventory.currentStock += quantity;
        inventory.lastRestocked = new Date();
        break;
      case 'out':
        if (inventory.availableStock < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient available stock'
          });
        }
        inventory.currentStock -= quantity;
        break;
      case 'adjustment':
        inventory.currentStock = quantity; // Set to exact quantity
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid movement type'
        });
    }

    // Add movement record
    addMovement(inventory, type, quantity, reason, reference, performedBy);

    await inventory.save();

    // Update product stock in product service
    try {
      await axios.put(`${process.env.PRODUCT_SERVICE_URL}/api/products/${req.params.productId}/stock`, {
        stock: inventory.currentStock
      });
    } catch (error) {
      console.warn('Failed to update product service stock:', error.message);
    }

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        inventory
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/inventory/:productId/reserve
// @desc    Reserve stock for order
// @access  Public (Called by order service)
router.put('/:productId/reserve', async (req, res) => {
  try {
    const { quantity, orderId } = req.body;

    if (!quantity || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and orderId are required'
      });
    }

    const inventory = await Inventory.findOne({ 
      productId: req.params.productId,
      isActive: true 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }

    if (inventory.availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient available stock for reservation'
      });
    }

    inventory.reservedStock += quantity;
    addMovement(inventory, 'reserved', quantity, 'Stock reserved for order', orderId);

    await inventory.save();

    res.json({
      success: true,
      message: 'Stock reserved successfully',
      data: {
        inventory
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/inventory/:productId/release
// @desc    Release reserved stock
// @access  Public (Called by order service)
router.put('/:productId/release', async (req, res) => {
  try {
    const { quantity, orderId, fulfill } = req.body;

    if (!quantity || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and orderId are required'
      });
    }

    const inventory = await Inventory.findOne({ 
      productId: req.params.productId,
      isActive: true 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }

    if (inventory.reservedStock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Cannot release more stock than reserved'
      });
    }

    inventory.reservedStock -= quantity;

    if (fulfill) {
      // Fulfill the order - reduce current stock
      inventory.currentStock -= quantity;
      addMovement(inventory, 'out', quantity, 'Stock fulfilled for order', orderId);
    } else {
      // Cancel the reservation - just release
      addMovement(inventory, 'released', quantity, 'Stock reservation cancelled', orderId);
    }

    await inventory.save();

    // Update product stock in product service
    try {
      await axios.put(`${process.env.PRODUCT_SERVICE_URL}/api/products/${req.params.productId}/stock`, {
        stock: inventory.currentStock
      });
    } catch (error) {
      console.warn('Failed to update product service stock:', error.message);
    }

    res.json({
      success: true,
      message: fulfill ? 'Stock fulfilled successfully' : 'Stock reservation released successfully',
      data: {
        inventory
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/inventory/alerts/low-stock
// @desc    Get low stock alerts
// @access  Public (In real app, this would be admin only)
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      isActive: true,
      $expr: { $lte: ['$availableStock', '$reorderLevel'] }
    }).sort({ availableStock: 1 });

    res.json({
      success: true,
      data: {
        lowStockItems,
        count: lowStockItems.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/inventory/stats/summary
// @desc    Get inventory statistics
// @access  Public (In real app, this would be admin only)
router.get('/stats/summary', async (req, res) => {
  try {
    const totalProducts = await Inventory.countDocuments({ isActive: true });
    const lowStockCount = await Inventory.countDocuments({
      isActive: true,
      $expr: { $lte: ['$availableStock', '$reorderLevel'] }
    });
    const outOfStockCount = await Inventory.countDocuments({
      isActive: true,
      availableStock: { $lte: 0 }
    });

    // Calculate total inventory value
    const inventoryValue = await Inventory.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: null, 
        totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
        totalStock: { $sum: '$currentStock' },
        totalReserved: { $sum: '$reservedStock' }
      }}
    ]);

    const stats = inventoryValue.length > 0 ? inventoryValue[0] : {
      totalValue: 0,
      totalStock: 0,
      totalReserved: 0
    };

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue: Math.round(stats.totalValue * 100) / 100,
        totalStock: stats.totalStock,
        totalReserved: stats.totalReserved,
        totalAvailable: stats.totalStock - stats.totalReserved
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/inventory/:productId/movements
// @desc    Get inventory movements for a product
// @access  Public (In real app, this would be admin only)
router.get('/:productId/movements', async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ 
      productId: req.params.productId,
      isActive: true 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }

    // Sort movements by date (newest first)
    const movements = inventory.movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: {
        productId: inventory.productId,
        productName: inventory.productName,
        movements
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
