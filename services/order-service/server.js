const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const orderRoutes = require('./routes/orderRoutes');
const rabbitmqHelper = require('./shared/rabbitmq');
const emailService = require('./shared/emailService');
const orderEventService = require('./services/orderEventService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Order Service is running',
    service: 'order-service',
    port: process.env.PORT,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Initialize services and database connection
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Initialize RabbitMQ
    await rabbitmqHelper.connect();
    console.log('Connected to RabbitMQ');

    // Initialize Email Service
    await emailService.initialize();
    console.log('Email service initialized');

    // Subscribe to user and payment events
    await orderEventService.subscribeToUserEvents();
    await orderEventService.subscribeToPaymentEvents();

    // Setup graceful shutdown
    rabbitmqHelper.setupGracefulShutdown();

    // Start server
    const PORT = process.env.PORT || 4003;
    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
