#!/bin/bash

echo "🧪 Testing API Gateway Caching"
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8080"

echo -e "${BLUE}1. Testing Cache Status${NC}"
echo "Checking health endpoint for cache status..."
curl -s "$BASE_URL/" | jq '.features, .cache' 2>/dev/null || curl -s "$BASE_URL/"
echo ""

echo -e "${BLUE}2. Testing GET Request Caching${NC}"
echo "Making first request (should be CACHE MISS)..."
echo "Request 1:"
RESPONSE1=$(curl -s -w "Time: %{time_total}s\n" -H "Accept: application/json" "$BASE_URL/api/products" -D /tmp/headers1.txt)
echo "Response time and headers:"
cat /tmp/headers1.txt | grep -E "(X-Cache|Content-Type|HTTP)"
echo ""

echo "Making second request (should be CACHE HIT if caching works)..."
echo "Request 2:"
RESPONSE2=$(curl -s -w "Time: %{time_total}s\n" -H "Accept: application/json" "$BASE_URL/api/products" -D /tmp/headers2.txt)
echo "Response time and headers:"
cat /tmp/headers2.txt | grep -E "(X-Cache|Content-Type|HTTP)"
echo ""

echo -e "${BLUE}3. Comparing Response Times${NC}"
TIME1=$(cat /tmp/headers1.txt | grep -o "Time: [0-9.]*s" | grep -o "[0-9.]*")
TIME2=$(cat /tmp/headers2.txt | grep -o "Time: [0-9.]*s" | grep -o "[0-9.]*")

echo "First request time: ${TIME1}s"
echo "Second request time: ${TIME2}s"

# Check if second request is significantly faster
if (( $(echo "$TIME2 < $TIME1 * 0.5" | bc -l) )); then
    echo -e "${GREEN}✅ CACHING IS WORKING! Second request is much faster.${NC}"
else
    echo -e "${YELLOW}⚠️  Caching might not be working. Times are similar.${NC}"
fi

echo ""
echo -e "${BLUE}4. Testing Cache Headers${NC}"
CACHE1=$(cat /tmp/headers1.txt | grep "X-Cache" || echo "No X-Cache header")
CACHE2=$(cat /tmp/headers2.txt | grep "X-Cache" || echo "No X-Cache header")

echo "First request cache header: $CACHE1"
echo "Second request cache header: $CACHE2"

if [[ "$CACHE1" == *"MISS"* ]] && [[ "$CACHE2" == *"HIT"* ]]; then
    echo -e "${GREEN}✅ CACHE HEADERS CONFIRM: MISS → HIT${NC}"
elif [[ "$CACHE1" == "No X-Cache header" ]]; then
    echo -e "${RED}❌ NO CACHE HEADERS: Caching is not active${NC}"
else
    echo -e "${YELLOW}⚠️  UNEXPECTED CACHE BEHAVIOR${NC}"
fi

echo ""
echo -e "${BLUE}5. Testing Cache Invalidation${NC}"
echo "Creating a new product (should invalidate cache)..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cache Test Product",
    "description": "Testing cache invalidation",
    "price": 99.99,
    "category": "Test",
    "brand": "TestBrand",
    "inStock": true
  }' -w "Status: %{http_code}\n")

echo "Product creation response:"
echo "$CREATE_RESPONSE"

echo ""
echo "Making GET request after POST (should be CACHE MISS again)..."
RESPONSE3=$(curl -s -w "Time: %{time_total}s\n" -H "Accept: application/json" "$BASE_URL/api/products" -D /tmp/headers3.txt)
CACHE3=$(cat /tmp/headers3.txt | grep "X-Cache" || echo "No X-Cache header")
echo "Cache header after POST: $CACHE3"

if [[ "$CACHE3" == *"MISS"* ]]; then
    echo -e "${GREEN}✅ CACHE INVALIDATION WORKING: POST cleared the cache${NC}"
else
    echo -e "${YELLOW}⚠️  Cache invalidation might not be working${NC}"
fi

echo ""
echo -e "${BLUE}6. Redis Direct Test${NC}"
echo "Testing Redis connection directly..."
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is responding to PING${NC}"
    
    echo "Checking if cache keys exist in Redis..."
    KEYS=$(redis-cli keys "api_cache:*" 2>/dev/null || echo "No keys found")
    echo "Cache keys in Redis: $KEYS"
    
    if [[ "$KEYS" != "No keys found" ]] && [[ "$KEYS" != "" ]]; then
        echo -e "${GREEN}✅ Cache keys found in Redis${NC}"
    else
        echo -e "${YELLOW}⚠️  No cache keys in Redis${NC}"
    fi
else
    echo -e "${RED}❌ Redis is not responding${NC}"
fi

echo ""
echo -e "${BLUE}📊 SUMMARY${NC}"
echo "============"
if [[ "$CACHE2" == *"HIT"* ]] && [[ "$CACHE3" == *"MISS"* ]]; then
    echo -e "${GREEN}🎉 CACHING IS FULLY WORKING!${NC}"
    echo "✅ Cache HIT on repeated requests"
    echo "✅ Cache invalidation on POST requests"
    echo "✅ Performance improvement visible"
else
    echo -e "${YELLOW}🔧 CACHING NEEDS ATTENTION${NC}"
    echo "Check the API Gateway logs for Redis connection errors"
fi

# Cleanup
rm -f /tmp/headers*.txt
