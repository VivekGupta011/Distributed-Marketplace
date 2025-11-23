const mongoose = require('mongoose');

// Inventory Movement Schema
const inventoryMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'reserved', 'released'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  reference: {
    type: String, // Order ID, Purchase ID, etc.
  },
  performedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// Inventory Schema Definition
const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    ref: 'Product'
  },
  productName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStock: {
    type: Number,
    default: 1000,
    min: 0
  },
  location: {
    warehouse: {
      type: String,
      default: 'Main Warehouse'
    },
    section: String,
    shelf: String,
    bin: String
  },
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  costPrice: {
    type: Number,
    min: 0
  },
  movements: [inventoryMovementSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastRestocked: Date,
  expiryDate: Date
}, {
  timestamps: true
});

// Calculate available stock before saving
inventorySchema.pre('save', function(next) {
  this.availableStock = this.currentStock - this.reservedStock;
  next();
});

// Virtual for low stock alert
inventorySchema.virtual('isLowStock').get(function() {
  return this.availableStock <= this.reorderLevel;
});

// Virtual for out of stock
inventorySchema.virtual('isOutOfStock').get(function() {
  return this.availableStock <= 0;
});

// Ensure virtual fields are serialized
inventorySchema.set('toJSON', { virtuals: true });

// Index for efficient queries
inventorySchema.index({ productId: 1 });
inventorySchema.index({ sku: 1 });
inventorySchema.index({ isActive: 1, availableStock: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
