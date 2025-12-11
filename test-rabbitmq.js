// Test RabbitMQ Connection
const amqp = require('amqplib');

async function testRabbitMQ() {
  try {
    console.log('Testing RabbitMQ connection...');
    
    // Connect to RabbitMQ (use the same URL as in docker-compose)
    const connection = await amqp.connect('amqp://admin:password123@localhost:5672');
    console.log('Connected to RabbitMQ');
    
    // Create channel
    const channel = await connection.createChannel();
    console.log('Channel created');
    
    // Assert exchanges (same as in the shared helper)
    await channel.assertExchange('order.events', 'topic', { durable: true });
    await channel.assertExchange('payment.events', 'topic', { durable: true });
    await channel.assertExchange('user.events', 'topic', { durable: true });
    console.log('Exchanges created successfully');
    
    // Test publishing a message
    const testMessage = {
      eventType: 'test.event',
      timestamp: new Date().toISOString(),
      data: { test: 'message' }
    };
    
    await channel.publish('user.events', 'test.event', Buffer.from(JSON.stringify(testMessage)));
    console.log('Test message published');
    
    // Close connection
    await channel.close();
    await connection.close();
    console.log('Connection closed');
    
    console.log('\n RabbitMQ test completed successfully!');
    
  } catch (error) {
    console.error('RabbitMQ test failed:', error.message);
    process.exit(1);
  }
}

testRabbitMQ();
