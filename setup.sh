#!/bin/bash

# E-commerce Microservices Setup Script
# This script helps you set up and run the entire e-commerce microservices application

echo "🚀 E-commerce Microservices Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    local status="$1"
    local message="$2"
    
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "error" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "info" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking Prerequisites${NC}"
echo "========================="

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "success" "Node.js is installed: $NODE_VERSION"
else
    print_status "error" "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "success" "npm is installed: $NPM_VERSION"
else
    print_status "error" "npm is not installed. Please install npm."
    exit 1
fi

# Check MongoDB
if command_exists mongod; then
    print_status "success" "MongoDB is installed"
else
    print_status "warning" "MongoDB not found. Please install MongoDB from https://www.mongodb.com/try/download/community"
fi

# Check NGINX
if command_exists nginx; then
    print_status "success" "NGINX is installed"
else
    print_status "warning" "NGINX not found. Please install NGINX from https://nginx.org/"
fi

echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing Dependencies${NC}"
echo "=========================="

services=("user-service" "product-service" "order-service" "inventory-service")

for service in "${services[@]}"; do
    echo -e "${YELLOW}Installing dependencies for $service...${NC}"
    if [ -d "services/$service" ]; then
        cd "services/$service"
        if npm install --silent; then
            print_status "success" "$service dependencies installed"
        else
            print_status "error" "Failed to install $service dependencies"
        fi
        cd ../..
    else
        print_status "error" "Directory services/$service not found"
    fi
done

echo ""

# Function to start services
start_services() {
    echo -e "${BLUE}🚀 Starting Services${NC}"
    echo "==================="
    
    # Start MongoDB
    echo -e "${YELLOW}Starting MongoDB...${NC}"
    if command_exists brew; then
        brew services start mongodb-community >/dev/null 2>&1
        print_status "info" "MongoDB started via Homebrew"
    else
        print_status "warning" "Please start MongoDB manually: sudo systemctl start mongod (Linux) or net start MongoDB (Windows)"
    fi
    
    echo ""
    echo -e "${YELLOW}Starting microservices...${NC}"
    echo "Please open 4 separate terminal windows and run these commands:"
    echo ""
    
    for i in "${!services[@]}"; do
        service="${services[$i]}"
        port=$((4001 + i))
        echo -e "${GREEN}Terminal $((i + 1)) - $service:${NC}"
        echo "cd $(pwd)/services/$service && npm start"
        echo ""
    done
    
    echo -e "${YELLOW}After all services are running, start NGINX:${NC}"
    echo -e "${GREEN}sudo cp nginx/simple-reverse-proxy.conf /usr/local/etc/nginx/nginx.conf${NC}"
    echo -e "${GREEN}sudo nginx${NC}"
    echo ""
}

# Function to test services
test_services() {
    echo -e "${BLUE}🧪 Testing Services${NC}"
    echo "==================="
    
    if [ -f "test-services.sh" ]; then
        chmod +x test-services.sh
        ./test-services.sh
    else
        print_status "error" "test-services.sh not found"
    fi
}

# Main menu
show_menu() {
    echo -e "${BLUE}📋 What would you like to do?${NC}"
    echo "1. Install dependencies only"
    echo "2. Show service startup commands"
    echo "3. Test services (run after starting all services)"
    echo "4. Show project structure"
    echo "5. Show API endpoints"
    echo "6. Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            echo "Dependencies already installed above."
            ;;
        2)
            start_services
            ;;
        3)
            test_services
            ;;
        4)
            show_project_structure
            ;;
        5)
            show_api_endpoints
            ;;
        6)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            show_menu
            ;;
    esac
}

# Function to show project structure
show_project_structure() {
    echo -e "${BLUE}📁 Project Structure${NC}"
    echo "==================="
    
    if command_exists tree; then
        tree -I 'node_modules|.git' .
    else
        find . -type f -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.conf" -o -name "*.sh" | grep -v node_modules | sort
    fi
    echo ""
}

# Function to show API endpoints
show_api_endpoints() {
    echo -e "${BLUE}🌐 API Endpoints${NC}"
    echo "================"
    echo ""
    echo -e "${GREEN}Base URL: http://localhost${NC}"
    echo ""
    echo -e "${YELLOW}User Service (Authentication):${NC}"
    echo "POST   /api/users/register     - Register new user"
    echo "POST   /api/users/login        - Login user"
    echo "GET    /api/users/profile      - Get user profile"
    echo "PUT    /api/users/profile      - Update user profile"
    echo ""
    echo -e "${YELLOW}Product Service (Catalog):${NC}"
    echo "GET    /api/products            - Get all products"
    echo "GET    /api/products/:id       - Get product by ID"
    echo "POST   /api/products           - Create product"
    echo "PUT    /api/products/:id       - Update product"
    echo "DELETE /api/products/:id       - Delete product"
    echo ""
    echo -e "${YELLOW}Order Service (Orders):${NC}"
    echo "GET    /api/orders              - Get all orders"
    echo "GET    /api/orders/:id         - Get order by ID"
    echo "POST   /api/orders             - Create order"
    echo "PUT    /api/orders/:id/status  - Update order status"
    echo ""
    echo -e "${YELLOW}Inventory Service (Stock):${NC}"
    echo "GET    /api/inventory           - Get all inventory"
    echo "GET    /api/inventory/:id      - Get inventory by product ID"
    echo "POST   /api/inventory          - Create inventory record"
    echo "PUT    /api/inventory/:id/stock - Update stock levels"
    echo ""
    echo -e "${YELLOW}Health Checks:${NC}"
    echo "GET    /health/users           - User service health"
    echo "GET    /health/products        - Product service health"
    echo "GET    /health/orders          - Order service health"
    echo "GET    /health/inventory       - Inventory service health"
    echo ""
}

# Show completion message
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo "1. Start all services using the commands shown above"
echo "2. Import Postman collections from the 'postman' directory"
echo "3. Run the test script to verify everything is working"
echo "4. Check README.md for detailed documentation"
echo ""

# Show menu
show_menu
