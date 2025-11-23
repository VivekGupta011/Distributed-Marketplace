#!/bin/bash

# E-commerce Microservices Test Script
# This script tests all microservices to ensure they are running correctly

echo "🧪 Testing E-commerce Microservices..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:8080"

# Function to test HTTP endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url" 2>/dev/null)
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        if command -v jq &> /dev/null; then
            jq -r '.message // .success // "Response received"' /tmp/response.json 2>/dev/null | head -1
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $status_code, Expected: $expected_status)"
        return 1
    fi
    echo ""
}

# Function to test service health
test_service_health() {
    local service_name="$1"
    local health_url="$2"
    
    echo -e "${BLUE}🔍 Testing $service_name${NC}"
    test_endpoint "$service_name Health Check" "$health_url" "200"
}

# Test API Gateway
echo -e "${YELLOW}🌐 Testing API Gateway${NC}"
test_endpoint "API Gateway" "$BASE_URL/" "200"

# Test individual service health endpoints
test_service_health "User Service" "$BASE_URL/health/users"
test_service_health "Product Service" "$BASE_URL/health/products"
test_service_health "Order Service" "$BASE_URL/health/orders"
test_service_health "Inventory Service" "$BASE_URL/health/inventory"

echo -e "${YELLOW}🔗 Testing API Routes${NC}"

# Test User Service routes
echo -e "${BLUE}👤 Testing User Service Routes${NC}"
test_endpoint "User Registration Endpoint" "$BASE_URL/api/users/register" "400"  # Should fail without data
test_endpoint "User Login Endpoint" "$BASE_URL/api/users/login" "400"  # Should fail without data

# Test Product Service routes
echo -e "${BLUE}📦 Testing Product Service Routes${NC}"
test_endpoint "Get Products" "$BASE_URL/api/products" "200"
test_endpoint "Get Categories" "$BASE_URL/api/products/categories/list" "200"
test_endpoint "Get Brands" "$BASE_URL/api/products/brands/list" "200"

# Test Order Service routes
echo -e "${BLUE}🛒 Testing Order Service Routes${NC}"
test_endpoint "Get Orders" "$BASE_URL/api/orders" "200"
test_endpoint "Get Order Stats" "$BASE_URL/api/orders/stats/summary" "200"

# Test Inventory Service routes
echo -e "${BLUE}📊 Testing Inventory Service Routes${NC}"
test_endpoint "Get Inventory" "$BASE_URL/api/inventory" "200"
test_endpoint "Get Inventory Stats" "$BASE_URL/api/inventory/stats/summary" "200"
test_endpoint "Get Low Stock Alerts" "$BASE_URL/api/inventory/alerts/low-stock" "200"

# Test 404 handling
echo -e "${YELLOW}🚫 Testing Error Handling${NC}"
test_endpoint "Non-existent API Route" "$BASE_URL/api/nonexistent" "404"
test_endpoint "Non-existent Product" "$BASE_URL/api/products/nonexistent" "500"  # Should return 500 for invalid ObjectId

# Summary
echo -e "${YELLOW}📋 Test Summary${NC}"
echo "======================================"

# Check if all services are responding
services=("users" "products" "orders" "inventory")
all_healthy=true

for service in "${services[@]}"; do
    response=$(curl -s "$BASE_URL/health/$service" 2>/dev/null)
    if echo "$response" | grep -q '"success":true' 2>/dev/null; then
        echo -e "${GREEN}✅ $service service: HEALTHY${NC}"
    else
        echo -e "${RED}❌ $service service: UNHEALTHY${NC}"
        all_healthy=false
    fi
done

echo ""
if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}🎉 All services are running correctly!${NC}"
    echo -e "${GREEN}🚀 Your e-commerce microservices are ready to use.${NC}"
    echo ""
    echo -e "${BLUE}📖 Next steps:${NC}"
    echo "1. Import Postman collections from the 'postman' directory"
    echo "2. Run the 'Complete-Ecommerce-Workflow' collection for end-to-end testing"
    echo "3. Check the README.md for detailed API documentation"
    echo ""
    echo -e "${BLUE}🌐 Access your services:${NC}"
    echo "• API Gateway: $BASE_URL"
    echo "• User Service: $BASE_URL/api/users"
    echo "• Product Service: $BASE_URL/api/products"
    echo "• Order Service: $BASE_URL/api/orders"
    echo "• Inventory Service: $BASE_URL/api/inventory"
else
    echo -e "${RED}⚠️  Some services are not responding correctly.${NC}"
    echo -e "${YELLOW}🔧 Troubleshooting tips:${NC}"
    echo "1. Ensure all services are running (check terminal windows)"
    echo "2. Verify MongoDB is running on port 27017"
    echo "3. Check NGINX configuration and restart if needed"
    echo "4. Review service logs for any error messages"
fi

echo ""
echo -e "${BLUE}🛠️  Service Management Commands:${NC}"
echo "• Start MongoDB: brew services start mongodb-community (macOS)"
echo "• Start NGINX: sudo nginx"
echo "• Stop NGINX: sudo nginx -s stop"
echo "• Reload NGINX: sudo nginx -s reload"

# Cleanup
rm -f /tmp/response.json

exit 0
