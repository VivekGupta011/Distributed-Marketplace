const amqp = require('amqplib');

class RabbitMQHelper {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async connect() {
    try {
      if (this.isConnected && this.connection && this.channel) {
        return { connection: this.connection, channel: this.channel };
      }

      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      console.log('Connecting to RabbitMQ...');
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Set up connection event handlers
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        this.isConnected = false;
        this.reconnect();
      });

      // Assert the three topic exchanges
      await this.channel.assertExchange('order.events', 'topic', { durable: true });
      await this.channel.assertExchange('payment.events', 'topic', { durable: true });
      await this.channel.assertExchange('user.events', 'topic', { durable: true });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Connected to RabbitMQ and exchanges asserted');

      return { connection: this.connection, channel: this.channel };
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect to RabbitMQ (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, this.reconnectDelay);
  }

  async publishEvent(exchange, routingKey, message, options = {}) {
    try {
      if (!this.isConnected || !this.channel) {
        await this.connect();
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const publishOptions = {
        persistent: true,
        timestamp: Date.now(),
        ...options
      };

      const published = this.channel.publish(exchange, routingKey, messageBuffer, publishOptions);
      
      if (!published) {
        console.error('Failed to publish message to exchange:', exchange);
        return false;
      }

      console.log(`Published event to ${exchange} with routing key ${routingKey}`);
      return true;
    } catch (error) {
      console.error('Error publishing event:', error);
      return false;
    }
  }

  async subscribeToEvents(exchange, routingKey, queueName, handler, options = {}) {
    try {
      if (!this.isConnected || !this.channel) {
        await this.connect();
      }

      // Assert queue with default options
      const queueOptions = {
        durable: true,
        ...options.queueOptions
      };
      
      await this.channel.assertQueue(queueName, queueOptions);
      await this.channel.bindQueue(queueName, exchange, routingKey);

      // Set prefetch to handle one message at a time
      await this.channel.prefetch(1);

      console.log(`Subscribed to ${exchange} with routing key ${routingKey} on queue ${queueName}`);

      await this.channel.consume(queueName, async (message) => {
        if (message) {
          try {
            const content = JSON.parse(message.content.toString());
            await handler(content, message);
            this.channel.ack(message);
          } catch (error) {
            console.error('Error processing message:', error);
            // Reject and don't requeue to avoid infinite loops
            this.channel.nack(message, false, false);
          }
        }
      });

    } catch (error) {
      console.error('Error subscribing to events:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  // Graceful shutdown handler
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Closing RabbitMQ connection...`);
      await this.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

// Export singleton instance
const rabbitmqHelper = new RabbitMQHelper();

module.exports = rabbitmqHelper;
