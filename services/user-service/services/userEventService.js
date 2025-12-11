const rabbitmqHelper = require('../shared/rabbitmq');
const emailService = require('../shared/emailService');

class UserEventService {
  constructor() {
    this.exchange = 'user.events';
  }

  async publishUserRegistered(userData) {
    try {
      const event = {
        eventType: 'user.registered',
        timestamp: new Date().toISOString(),
        data: {
          userId: userData._id,
          email: userData.email,
          name: userData.name,
          registeredAt: userData.createdAt
        }
      };

      await rabbitmqHelper.publishEvent(this.exchange, 'user.registered', event);
      console.log(`Published user.registered event for user ${userData._id}`);

      // Send welcome email
      await emailService.sendWelcomeEmail(userData.email, userData.name);
    } catch (error) {
      console.error('Error publishing user registered event:', error);
    }
  }

  async publishUserLogin(userData) {
    try {
      const event = {
        eventType: 'user.login',
        timestamp: new Date().toISOString(),
        data: {
          userId: userData._id,
          email: userData.email,
          loginAt: new Date().toISOString()
        }
      };

      await rabbitmqHelper.publishEvent(this.exchange, 'user.login', event);
      console.log(`Published user.login event for user ${userData._id}`);
    } catch (error) {
      console.error('Error publishing user login event:', error);
    }
  }

  async publishUserProfileUpdated(userData) {
    try {
      const event = {
        eventType: 'user.profile.updated',
        timestamp: new Date().toISOString(),
        data: {
          userId: userData._id,
          email: userData.email,
          name: userData.name,
          updatedAt: new Date().toISOString()
        }
      };

      await rabbitmqHelper.publishEvent(this.exchange, 'user.profile.updated', event);
      console.log(`Published user.profile.updated event for user ${userData._id}`);
    } catch (error) {
      console.error('Error publishing user profile updated event:', error);
    }
  }

  async publishUserDeactivated(userId) {
    try {
      const event = {
        eventType: 'user.deactivated',
        timestamp: new Date().toISOString(),
        data: {
          userId: userId,
          deactivatedAt: new Date().toISOString()
        }
      };

      await rabbitmqHelper.publishEvent(this.exchange, 'user.deactivated', event);
      console.log(`Published user.deactivated event for user ${userId}`);
    } catch (error) {
      console.error('Error publishing user deactivated event:', error);
    }
  }

  // Subscribe to order events to handle user-related order notifications
  async subscribeToOrderEvents() {
    try {
      // Subscribe to order confirmation events to potentially send additional user notifications
      await rabbitmqHelper.subscribeToEvents(
        'order.events',
        'order.created',
        'user-service-order-notifications',
        this.handleOrderCreated.bind(this)
      );

      console.log('Subscribed to order events for user notifications');
    } catch (error) {
      console.error('Error subscribing to order events:', error);
    }
  }

  async handleOrderCreated(eventData) {
    try {
      console.log('Received order created event:', eventData);
      // Here you could add additional user-specific logic
      // For example, updating user order history, loyalty points, etc.
    } catch (error) {
      console.error('Error handling order created event:', error);
    }
  }
}

module.exports = new UserEventService();
