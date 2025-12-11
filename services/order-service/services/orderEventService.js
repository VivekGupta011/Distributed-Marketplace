const rabbitmqHelper = require('../shared/rabbitmq');
const emailService = require('../shared/emailService');

class OrderEventService {
  constructor() {
    this.orderExchange = 'order.events';
    this.paymentExchange = 'payment.events';
  }

  async publishOrderCreated(orderData) {
    try {
      const event = {
        eventType: 'order.created',
        timestamp: new Date().toISOString(),
        data: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          userId: orderData.userId,
          userEmail: orderData.userEmail,
          items: orderData.items,
          orderSummary: orderData.orderSummary,
          status: orderData.status,
          paymentMethod: orderData.paymentMethod,
          createdAt: orderData.createdAt
        }
      };

      await rabbitmqHelper.publishEvent(this.orderExchange, 'order.created', event);
      console.log(`Published order.created event for order ${orderData.orderNumber}`);

      // Send order confirmation email
      await emailService.sendOrderConfirmationEmail(orderData.userEmail, {
        orderNumber: orderData.orderNumber,
        items: orderData.items,
        orderSummary: orderData.orderSummary
      });
    } catch (error) {
      console.error('Error publishing order created event:', error);
    }
  }

  async publishOrderStatusUpdated(orderData, previousStatus) {
    try {
      const event = {
        eventType: 'order.status.updated',
        timestamp: new Date().toISOString(),
        data: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          userId: orderData.userId,
          userEmail: orderData.userEmail,
          previousStatus: previousStatus,
          currentStatus: orderData.status,
          trackingNumber: orderData.trackingNumber,
          estimatedDelivery: orderData.estimatedDelivery,
          deliveredAt: orderData.deliveredAt,
          updatedAt: new Date().toISOString()
        }
      };

      await rabbitmqHelper.publishEvent(this.orderExchange, 'order.status.updated', event);
      console.log(`Published order.status.updated event for order ${orderData.orderNumber}`);

      // Send status update email
      await emailService.sendOrderStatusUpdateEmail(orderData.userEmail, {
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        trackingNumber: orderData.trackingNumber
      });
    } catch (error) {
      console.error('Error publishing order status updated event:', error);
    }
  }

  async publishPaymentStatusUpdated(orderData, previousPaymentStatus) {
    try {
      const event = {
        eventType: 'payment.status.updated',
        timestamp: new Date().toISOString(),
        data: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          userId: orderData.userId,
          userEmail: orderData.userEmail,
          previousPaymentStatus: previousPaymentStatus,
          currentPaymentStatus: orderData.paymentStatus,
          paymentMethod: orderData.paymentMethod,
          orderTotal: orderData.orderSummary.total,
          updatedAt: new Date().toISOString()
        }
      };

      await rabbitmqHelper.publishEvent(this.paymentExchange, 'payment.status.updated', event);
      console.log(`Published payment.status.updated event for order ${orderData.orderNumber}`);
    } catch (error) {
      console.error('Error publishing payment status updated event:', error);
    }
  }

  async publishOrderCancelled(orderData) {
    try {
      const event = {
        eventType: 'order.cancelled',
        timestamp: new Date().toISOString(),
        data: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          userId: orderData.userId,
          userEmail: orderData.userEmail,
          items: orderData.items,
          orderSummary: orderData.orderSummary,
          cancelledAt: new Date().toISOString()
        }
      };

      await rabbitmqHelper.publishEvent(this.orderExchange, 'order.cancelled', event);
      console.log(`Published order.cancelled event for order ${orderData.orderNumber}`);

      // Send cancellation email
      await emailService.sendOrderStatusUpdateEmail(orderData.userEmail, {
        orderNumber: orderData.orderNumber,
        status: 'cancelled'
      });
    } catch (error) {
      console.error('Error publishing order cancelled event:', error);
    }
  }

  // Subscribe to user events to handle user-related order processing
  async subscribeToUserEvents() {
    try {
      // Subscribe to user deactivation events to handle order processing
      await rabbitmqHelper.subscribeToEvents(
        'user.events',
        'user.deactivated',
        'order-service-user-deactivated',
        this.handleUserDeactivated.bind(this)
      );

      console.log('Subscribed to user events for order processing');
    } catch (error) {
      console.error('Error subscribing to user events:', error);
    }
  }

  async handleUserDeactivated(eventData) {
    try {
      console.log('Received user deactivated event:', eventData);
      // Here you could add logic to handle orders for deactivated users
      // For example, cancel pending orders, update order records, etc.
    } catch (error) {
      console.error('Error handling user deactivated event:', error);
    }
  }

  // Subscribe to payment events from external payment services
  async subscribeToPaymentEvents() {
    try {
      // Subscribe to payment confirmation events
      await rabbitmqHelper.subscribeToEvents(
        'payment.events',
        'payment.confirmed',
        'order-service-payment-confirmed',
        this.handlePaymentConfirmed.bind(this)
      );

      // Subscribe to payment failed events
      await rabbitmqHelper.subscribeToEvents(
        'payment.events',
        'payment.failed',
        'order-service-payment-failed',
        this.handlePaymentFailed.bind(this)
      );

      console.log('Subscribed to payment events for order processing');
    } catch (error) {
      console.error('Error subscribing to payment events:', error);
    }
  }

  async handlePaymentConfirmed(eventData) {
    try {
      console.log('Received payment confirmed event:', eventData);
      // Here you could add logic to automatically update order status
      // when payment is confirmed by external payment service
    } catch (error) {
      console.error('Error handling payment confirmed event:', error);
    }
  }

  async handlePaymentFailed(eventData) {
    try {
      console.log('Received payment failed event:', eventData);
      // Here you could add logic to handle failed payments
      // For example, cancel orders, notify users, etc.
    } catch (error) {
      console.error('Error handling payment failed event:', error);
    }
  }
}

module.exports = new OrderEventService();
