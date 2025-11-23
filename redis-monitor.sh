#!/bin/bash

echo "🔍 Redis Monitoring & Testing Script"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}1. Redis Server Status${NC}"
echo "----------------------"

# Check if Redis is running
if pgrep redis-server > /dev/null; then
    echo -e "${GREEN}✅ Redis server is running${NC}"
    
    # Get Redis process info
    REDIS_PID=$(pgrep redis-server)
    echo "Redis PID: $REDIS_PID"
    
    # Check Redis port
    if lsof -i :6379 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is listening on port 6379${NC}"
    else
        echo -e "${RED}❌ Redis is not listening on port 6379${NC}"
    fi
else
    echo -e "${RED}❌ Redis server is not running${NC}"
    echo "Start Redis with: brew services start redis"
    exit 1
fi

echo ""
echo -e "${BLUE}2. Redis Connection Test${NC}"
echo "------------------------"

# Test basic Redis commands
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis PING successful${NC}"
    
    # Get Redis info
    echo "Redis version: $(redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r')"
    echo "Redis mode: $(redis-cli info server | grep redis_mode | cut -d: -f2 | tr -d '\r')"
    echo "Used memory: $(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')"
else
    echo -e "${RED}❌ Redis PING failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}3. API Gateway Cache Test${NC}"
echo "-------------------------"

# Check if API Gateway is running
if curl -s http://localhost:8080/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway is responding${NC}"
    
    # Check cache status from health endpoint
    CACHE_STATUS=$(curl -s http://localhost:8080/ | jq -r '.cache.status' 2>/dev/null || echo "unknown")
    echo "Cache status: $CACHE_STATUS"
    
    if [[ "$CACHE_STATUS" == "healthy" ]]; then
        echo -e "${GREEN}✅ Cache is healthy${NC}"
    elif [[ "$CACHE_STATUS" == "disconnected" ]]; then
        echo -e "${YELLOW}⚠️ Cache is disconnected${NC}"
    else
        echo -e "${RED}❌ Cache status unknown${NC}"
    fi
else
    echo -e "${RED}❌ API Gateway is not responding${NC}"
    echo "Make sure API Gateway is running on port 8080"
fi

echo ""
echo -e "${BLUE}4. Live Cache Monitoring${NC}"
echo "------------------------"

# Function to monitor cache keys in real-time
monitor_cache() {
    echo "Monitoring cache keys (press Ctrl+C to stop)..."
    echo "Make some API requests to see cache keys appear!"
    echo ""
    
    while true; do
        KEYS=$(redis-cli keys "api_cache:*" 2>/dev/null)
        KEY_COUNT=$(echo "$KEYS" | wc -l)
        
        if [[ "$KEYS" != "" ]]; then
            echo -e "${GREEN}📊 Found $KEY_COUNT cache keys:${NC}"
            echo "$KEYS" | while read -r key; do
                if [[ "$key" != "" ]]; then
                    TTL=$(redis-cli ttl "$key" 2>/dev/null)
                    echo "  🔑 $key (TTL: ${TTL}s)"
                fi
            done
        else
            echo -e "${YELLOW}📊 No cache keys found${NC}"
        fi
        
        echo "$(date): Checking cache keys..."
        sleep 3
        echo ""
    done
}

echo ""
echo -e "${BLUE}5. Manual Cache Testing${NC}"
echo "----------------------"

echo "Creating test cache entry..."
redis-cli setex "api_cache:GET:/api/test:{}" 60 '{"test": true, "timestamp": "'$(date)'"}'

echo "Reading test cache entry..."
TEST_VALUE=$(redis-cli get "api_cache:GET:/api/test:{}")
echo "Cached value: $TEST_VALUE"

echo "Deleting test cache entry..."
redis-cli del "api_cache:GET:/api/test:{}"

echo ""
echo -e "${BLUE}6. Cache Performance Test${NC}"
echo "-------------------------"

if curl -s http://localhost:8080/api/products > /dev/null 2>&1; then
    echo "Testing cache performance with /api/products..."
    
    echo "Request 1 (should be MISS):"
    TIME1=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:8080/api/products)
    echo "Time: ${TIME1}s"
    
    sleep 1
    
    echo "Request 2 (should be HIT if caching works):"
    TIME2=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:8080/api/products)
    echo "Time: ${TIME2}s"
    
    # Check if second request is faster
    if (( $(echo "$TIME2 < $TIME1 * 0.8" | bc -l) )); then
        echo -e "${GREEN}✅ Second request is faster - caching might be working!${NC}"
    else
        echo -e "${YELLOW}⚠️ No significant speed improvement${NC}"
    fi
    
    # Check for cache keys after requests
    CACHE_KEYS=$(redis-cli keys "api_cache:GET:/api/products*")
    if [[ "$CACHE_KEYS" != "" ]]; then
        echo -e "${GREEN}✅ Cache keys found after requests:${NC}"
        echo "$CACHE_KEYS"
    else
        echo -e "${RED}❌ No cache keys found - caching is not working${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Cannot test /api/products - endpoint not responding${NC}"
fi

echo ""
echo -e "${BLUE}7. Options Menu${NC}"
echo "---------------"
echo "1. Monitor cache keys in real-time"
echo "2. Clear all cache keys"
echo "3. Show Redis statistics"
echo "4. Exit"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo ""
        monitor_cache
        ;;
    2)
        echo "Clearing all cache keys..."
        DELETED=$(redis-cli eval "return #redis.call('keys', 'api_cache:*')" 0)
        redis-cli eval "for i, name in ipairs(redis.call('KEYS', 'api_cache:*')) do redis.call('DEL', name); end" 0
        echo "Deleted cache keys: $DELETED"
        ;;
    3)
        echo ""
        echo -e "${BLUE}Redis Statistics:${NC}"
        redis-cli info stats | grep -E "(keyspace_hits|keyspace_misses|total_commands_processed)"
        echo ""
        echo -e "${BLUE}Memory Usage:${NC}"
        redis-cli info memory | grep -E "(used_memory_human|used_memory_peak_human)"
        ;;
    4)
        echo "Goodbye! 👋"
        exit 0
        ;;
    *)
        echo "Invalid option"
        ;;
esac
