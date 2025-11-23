// Simple Redis connection test
const Redis = require('ioredis');

console.log('🔍 Testing Redis Connection...');
console.log('================================');

// Test 1: Basic Redis connection
const redis = new Redis('redis://localhost:6379', {
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('ready', () => {
  console.log('✅ Redis is ready');
  testRedisOperations();
});

redis.on('error', (error) => {
  console.log('❌ Redis error:', error.message);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

async function testRedisOperations() {
  try {
    console.log('\n🧪 Testing Redis Operations:');
    
    // Test PING
    const pingResult = await redis.ping();
    console.log('PING result:', pingResult);
    
    // Test SET
    await redis.set('test_key', 'test_value');
    console.log('✅ SET operation successful');
    
    // Test GET
    const value = await redis.get('test_key');
    console.log('GET result:', value);
    
    // Test JSON operations (like our cache)
    const testData = { message: 'Hello from cache', timestamp: new Date().toISOString() };
    await redis.setex('test_json', 60, JSON.stringify(testData));
    console.log('✅ JSON SET operation successful');
    
    const jsonValue = await redis.get('test_json');
    const parsedValue = JSON.parse(jsonValue);
    console.log('JSON GET result:', parsedValue);
    
    // Test cache key format (same as our API Gateway uses)
    const cacheKey = 'api_cache:GET:/api/products:{}';
    const cacheData = { products: [{ id: 1, name: 'Test Product' }] };
    await redis.setex(cacheKey, 300, JSON.stringify(cacheData));
    console.log('✅ Cache-style SET operation successful');
    
    // List all keys
    const keys = await redis.keys('*');
    console.log('All keys in Redis:', keys);
    
    // Clean up
    await redis.del('test_key', 'test_json', cacheKey);
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 Redis is working perfectly!');
    console.log('The issue is likely in the API Gateway Redis initialization.');
    
  } catch (error) {
    console.log('❌ Redis operation failed:', error.message);
  } finally {
    await redis.quit();
    console.log('👋 Disconnected from Redis');
    process.exit(0);
  }
}

// Start the test
redis.connect().catch(error => {
  console.log('❌ Failed to connect to Redis:', error.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - Redis might not be responding');
  process.exit(1);
}, 10000);
