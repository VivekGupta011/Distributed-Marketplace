# E-commerce Microservices Application

A simple e-commerce microservices application built for learning purposes. This project demonstrates microservices architecture with NGINX reverse proxy as an API Gateway.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────────────────────────┐
│   Client Apps   │    │            NGINX Proxy              │
│  (Web/Mobile)   │◄──►│         (API Gateway)               │
└─────────────────┘    │          Port: 80                   │
                       └──────────────────────────────────────┘
                                         │
                       ┌─────────────────┼─────────────────┐
                       │                 │                 │
                       ▼                 ▼                 ▼
              ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
              │  User Service   │ │ Product Service │ │  Order Service  │
              │    Port: 4001   │ │    Port: 4002   │ │    Port: 4003   │
              └─────────────────┘ └─────────────────┘ └─────────────────┘
                       │                 │                 │
                       └─────────────────┼─────────────────┘
                                         │
                                         ▼
                              ┌─────────────────┐
                              │Inventory Service│
                              │    Port: 4004   │
                              └─────────────────┘
                                         │
                                         ▼
                              ┌─────────────────┐
                              │    MongoDB      │
                              │    Port: 27017  │
                              └─────────────────┘
```

## 🚀 Services Overview

### 1. User Service (Port 4001)
- **Purpose**: User management and authentication
- **Features**:
  - User registration and login
  - JWT authentication
  - User profile management
  - Admin user management
- **Routes**: `/api/users/*`

### 2. Product Service (Port 4002)
- **Purpose**: Product catalog management
- **Features**:
  - Product CRUD operations
  - Product search and filtering
  - Category and brand management
  - Stock level tracking
- **Routes**: `/api/products/*`

### 3. Order Service (Port 4003)
- **Purpose**: Order processing and management
- **Features**:
  - Order creation and tracking
  - Order history and status updates
  - Order statistics
  - Integration with product and inventory services
- **Routes**: `/api/orders/*`

### 4. Inventory Service (Port 4004)
- **Purpose**: Stock and inventory management
- **Features**:
  - Stock level monitoring
  - Inventory movements tracking
  - Stock reservations for orders
  - Low stock alerts
- **Routes**: `/api/inventory/*`

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **NGINX** - [Download](https://nginx.org/en/download.html)
- **npm** (comes with Node.js)

## 🛠️ Installation & Setup

### Step 1: Clone and Install Dependencies

```bash
# Navigate to the project directory
cd /Users/vivek.hiralal/Code/e-commerce

# Install dependencies for all services
cd services/user-service && npm install
cd ../product-service && npm install
cd ../order-service && npm install
cd ../inventory-service && npm install
cd ../..
```

### Step 2: Start MongoDB

```bash
# Start MongoDB service
# On macOS with Homebrew:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod

# On Windows:
net start MongoDB
```

Verify MongoDB is running:
```bash
mongosh --eval "db.adminCommand('ismaster')"
```

### Step 3: Start All Microservices

Open **4 separate terminal windows** and run each service:

**Terminal 1 - User Service:**
```bash
cd /Users/vivek.hiralal/Code/e-commerce/services/user-service
npm start
```

**Terminal 2 - Product Service:**
```bash
cd /Users/vivek.hiralal/Code/e-commerce/services/product-service
npm start
```

**Terminal 3 - Order Service:**
```bash
cd /Users/vivek.hiralal/Code/e-commerce/services/order-service
npm start
```

**Terminal 4 - Inventory Service:**
```bash
cd /Users/vivek.hiralal/Code/e-commerce/services/inventory-service
npm start
```

### Step 4: Configure and Start NGINX

**Copy the NGINX configuration:**
```bash
# On macOS with Homebrew:
sudo cp /Users/vivek.hiralal/Code/e-commerce/nginx/simple-reverse-proxy.conf /usr/local/etc/nginx/nginx.conf

# On Linux:
sudo cp /Users/vivek.hiralal/Code/e-commerce/nginx/simple-reverse-proxy.conf /etc/nginx/nginx.conf

# On Windows:
# Copy to C:\nginx\conf\nginx.conf
```

**Start NGINX:**
```bash
# On macOS with Homebrew:
sudo nginx

# On Linux:
sudo systemctl start nginx

# On Windows:
# Navigate to nginx directory and run: nginx.exe
```

**Verify NGINX is running:**
```bash
curl http://localhost
```

## 🌐 API Gateway Access

Once all services and NGINX are running, you can access all services through a **single entry point**:

**Base URL:** `http://localhost`

### Service Endpoints:

- **User Service:** `http://localhost/api/users/*`
- **Product Service:** `http://localhost/api/products/*`
- **Order Service:** `http://localhost/api/orders/*`
- **Inventory Service:** `http://localhost/api/inventory/*`

### Health Check Endpoints:

- **API Gateway:** `http://localhost/`
- **User Service:** `http://localhost/health/users`
- **Product Service:** `http://localhost/health/products`
- **Order Service:** `http://localhost/health/orders`
- **Inventory Service:** `http://localhost/health/inventory`

## 📊 Database Architecture

### MongoDB Collections:

```
ecommerce_microservices (Database)
├── users
│   ├── _id (ObjectId)
│   ├── name (String)
│   ├── email (String, unique)
│   ├── password (String, hashed)
│   ├── phone (String)
│   ├── address (Object)
│   ├── role (String: customer/admin)
│   ├── isActive (Boolean)
│   ├── createdAt (Date)
│   └── updatedAt (Date)
│
├── products
│   ├── _id (ObjectId)
│   ├── name (String)
│   ├── description (String)
│   ├── price (Number)
│   ├── category (String)
│   ├── brand (String)
│   ├── stock (Number)
│   ├── images (Array of URLs)
│   ├── specifications (Object)
│   ├── ratings (Object)
│   ├── tags (Array)
│   ├── isActive (Boolean)
│   ├── featured (Boolean)
│   ├── createdAt (Date)
│   └── updatedAt (Date)
│
├── orders
│   ├── _id (ObjectId)
│   ├── orderNumber (String, unique)
│   ├── userId (ObjectId, ref: User)
│   ├── userEmail (String)
│   ├── items (Array of OrderItems)
│   ├── shippingAddress (Object)
│   ├── orderSummary (Object)
│   ├── status (String)
│   ├── paymentStatus (String)
│   ├── paymentMethod (String)
│   ├── trackingNumber (String)
│   ├── estimatedDelivery (Date)
│   ├── deliveredAt (Date)
│   ├── notes (String)
│   ├── createdAt (Date)
│   └── updatedAt (Date)
│
└── inventories
    ├── _id (ObjectId)
    ├── productId (ObjectId, ref: Product)
    ├── productName (String)
    ├── sku (String, unique)
    ├── currentStock (Number)
    ├── reservedStock (Number)
    ├── availableStock (Number, virtual)
    ├── reorderLevel (Number)
    ├── maxStock (Number)
    ├── location (Object)
    ├── supplier (Object)
    ├── costPrice (Number)
    ├── movements (Array of Movements)
    ├── isActive (Boolean)
    ├── lastRestocked (Date)
    ├── expiryDate (Date)
    ├── createdAt (Date)
    └── updatedAt (Date)
```

## 🔄 Complete E-commerce Flow Example

### 1. User Registration
```bash
curl -X POST http://localhost/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    }
  }'
```

### 2. User Login
```bash
curl -X POST http://localhost/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Create Product
```bash
curl -X POST http://localhost/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone with advanced features",
    "price": 999.99,
    "category": "Electronics",
    "brand": "Apple",
    "stock": 50,
    "images": ["https://example.com/iphone15.jpg"],
    "specifications": {
      "color": "Space Black",
      "storage": "256GB",
      "warranty": "1 year"
    },
    "tags": ["smartphone", "apple", "premium"]
  }'
```

### 4. Browse Products
```bash
# Get all products with pagination
curl "http://localhost/api/products?page=1&limit=10"

# Search products
curl "http://localhost/api/products?search=iPhone"

# Filter by category and price
curl "http://localhost/api/products?category=Electronics&minPrice=500&maxPrice=1500"
```

### 5. Create Inventory Record
```bash
curl -X POST http://localhost/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_FROM_STEP_3",
    "productName": "iPhone 15 Pro",
    "sku": "IPH15P-256-SB",
    "currentStock": 50,
    "reorderLevel": 10,
    "maxStock": 200,
    "location": {
      "warehouse": "Main Warehouse",
      "section": "Electronics",
      "shelf": "A1",
      "bin": "001"
    },
    "supplier": {
      "name": "Apple Inc.",
      "contact": "+1-800-APL-CARE",
      "email": "supplier@apple.com"
    },
    "costPrice": 750.00
  }'
```

### 6. Create Order
```bash
curl -X POST http://localhost/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_STEP_1",
    "userEmail": "john@example.com",
    "items": [
      {
        "productId": "PRODUCT_ID_FROM_STEP_3",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "fullName": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "phone": "1234567890"
    },
    "paymentMethod": "credit_card"
  }'
```

### 7. Update Order Status
```bash
curl -X PUT http://localhost/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "trackingNumber": "TRK123456789",
    "estimatedDelivery": "2024-01-15",
    "notes": "Order confirmed and processing"
  }'
```

## 🧪 Testing Script

Create a simple test script to verify all services:

```bash
#!/bin/bash
echo "Testing E-commerce Microservices..."

echo "1. Testing API Gateway..."
curl -s http://localhost/ | jq .

echo "2. Testing User Service..."
curl -s http://localhost/health/users | jq .

echo "3. Testing Product Service..."
curl -s http://localhost/health/products | jq .

echo "4. Testing Order Service..."
curl -s http://localhost/health/orders | jq .

echo "5. Testing Inventory Service..."
curl -s http://localhost/health/inventory | jq .

echo "All services are running!"
```

## 🛑 Stopping Services

### Stop NGINX:
```bash
# On macOS/Linux:
sudo nginx -s stop

# On Windows:
nginx.exe -s stop
```

### Stop MongoDB:
```bash
# On macOS with Homebrew:
brew services stop mongodb-community

# On Linux:
sudo systemctl stop mongod

# On Windows:
net stop MongoDB
```

### Stop Node.js Services:
Press `Ctrl+C` in each terminal window running the services.

## 🔧 Development Mode

For development, you can use `nodemon` to auto-restart services on file changes:

```bash
# In each service directory:
npm run dev
```

## 📝 Environment Variables

Each service uses environment variables defined in `.env` files:

### User Service (.env):
```
PORT=4001
MONGODB_URI=mongodb://localhost:27017/ecommerce_microservices
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d
```

### Product Service (.env):
```
PORT=4002
MONGODB_URI=mongodb://localhost:27017/ecommerce_microservices
```

### Order Service (.env):
```
PORT=4003
MONGODB_URI=mongodb://localhost:27017/ecommerce_microservices
PRODUCT_SERVICE_URL=http://localhost:4002
INVENTORY_SERVICE_URL=http://localhost:4004
```

### Inventory Service (.env):
```
PORT=4004
MONGODB_URI=mongodb://localhost:27017/ecommerce_microservices
PRODUCT_SERVICE_URL=http://localhost:4002
```

## 🚨 Troubleshooting

### Common Issues:

1. **Port already in use:**
   ```bash
   # Find process using port
   lsof -i :PORT_NUMBER
   # Kill process
   kill -9 PID
   ```

2. **MongoDB connection error:**
   - Ensure MongoDB is running
   - Check connection string in `.env` files
   - Verify MongoDB is accessible on port 27017

3. **NGINX configuration error:**
   ```bash
   # Test NGINX configuration
   nginx -t
   # Reload NGINX configuration
   nginx -s reload
   ```

4. **Service not responding:**
   - Check if all dependencies are installed
   - Verify environment variables
   - Check service logs for errors

## 📚 Learning Objectives

This project demonstrates:

- **Microservices Architecture**: Separation of concerns into independent services
- **API Gateway Pattern**: Single entry point using NGINX reverse proxy
- **Service Communication**: HTTP-based inter-service communication
- **Database Design**: MongoDB schema design for microservices
- **Authentication**: JWT-based authentication and authorization
- **Error Handling**: Consistent error responses across services
- **Logging**: Request logging and error tracking
- **Health Checks**: Service monitoring and health endpoints

## 🔮 Next Steps

To extend this project, consider adding:

- **Docker containerization** for easier deployment
- **Message queues** (RabbitMQ/Redis) for async communication
- **Caching layer** (Redis) for improved performance
- **API rate limiting** and throttling
- **Comprehensive logging** with ELK stack
- **Monitoring** with Prometheus and Grafana
- **Unit and integration tests**
- **CI/CD pipeline** with GitHub Actions
- **Load balancing** for high availability

## 📄 License

This project is created for educational purposes. Feel free to use and modify as needed.

---

**Happy Learning! 🚀**
