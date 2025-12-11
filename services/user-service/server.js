const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const rabbitmqHelper = require('./shared/rabbitmq');
const emailService = require('./shared/emailService');
const userEventService = require('./services/userEventService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User Service is running',
    service: 'user-service',
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
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Initializing RabbitMQ...');
    // Initialize RabbitMQ
    await rabbitmqHelper.connect();
    console.log('✅ Connected to RabbitMQ');

    console.log('🔄 Initializing Email Service...');
    // Initialize Email Service
    await emailService.initialize();
    console.log('✅ Email service initialized');

    console.log('🔄 Subscribing to order events...');
    // Subscribe to order events
    await userEventService.subscribeToOrderEvents();
    console.log('✅ Subscribed to order events');

    // Setup graceful shutdown
    rabbitmqHelper.setupGracefulShutdown();

    // Start server
    const PORT = process.env.PORT || 4001;
    app.listen(PORT, () => {
      console.log(`User Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
