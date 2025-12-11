# E-commerce Microservices Application


A simple e-commerce microservices application built for learning purposes. This project demonstrates microservices architecture with NGINX reverse proxy as an API Gateway, RabbitMQ for asynchronous messaging, and email notifications.


## 🏗️ Architecture Overview


```
┌─────────────────┐    ┌──────────────────────────────────────┐
│   Client Apps   │    │            NGINX Proxy              │
│  (Web/Mobile)   │◄──►│         (API Gateway)               │
└─────────────────┘    │          Port: 80                   │
                       └──────────────────────────────────────┘
                                         │
                       ┌─────────────────┼─────────────────┬─────────────────┐
                       │                 │                 │                 │
                       ▼                 ▼                 ▼                 ▼
              ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
              │  User Service   │ │ Product Service │ │  Order Service  │ │ Email Service   │
              │    Port: 4001   │ │    Port: 4002   │ │    Port: 4003   │ │    Port: 4005   │
              └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
                       │                 │                 │                 │
                       └─────────────────┼─────────────────┴─────────────────┘
                                         │                 │
                                         ▼                 ▼
                              ┌─────────────────┐ ┌─────────────────┐
                              │Inventory Service│ │    RabbitMQ     │
                              │    Port: 4004   │ │   Port: 5672    │
                              └─────────────────┘ │  (Message Queue)│
                                         │        └─────────────────┘
                                         │                 │
                                         ▼                 │
                              ┌─────────────────┐          │
                              │    MongoDB      │          │
                              │    Port: 27017  │◄─────────┘
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
  - Publishes user events to RabbitMQ
- **Routes**: /api/users/* 


### 2. Product Service (Port 4002)
- **Purpose**: Product catalog management
- **Features**:
  - Product CRUD operations
  - Product search and filtering
  - Category and brand management
  - Stock level tracking
  - Publishes product events to RabbitMQ
- **Routes**: /api/products/* 


### 3. Order Service (Port 4003)
- **Purpose**: Order processing and management
- **Features**:
  - Order creation and tracking
  - Order history and status updates
  - Order statistics
  - Integration with product and inventory services
  - Publishes order events to RabbitMQ
- **Routes**: /api/orders/* 


### 4. Inventory Service (Port 4004)
- **Purpose**: Stock and inventory management
- **Features**:
  - Stock level monitoring
  - Inventory movements tracking
  - Stock reservations for orders
  - Low stock alerts
  - Consumes product and order events from RabbitMQ
- **Routes**: /api/inventory/* 


### 5. Email Service (Port 4005)
- **Purpose**: Email notification management
- **Features**:
  - Welcome emails for new users
  - Order confirmation emails
  - Order status update notifications
  - Password reset emails
  - Low stock alerts for admins
  - Consumes events from RabbitMQ
- **Routes**: /api/emails/* 


## 📨 Message Queue (RabbitMQ)


### Exchanges and Queues:
- **user.events**: User registration, profile updates
- **order.events**: Order creation, status updates
- **product.events**: Product updates, stock changes
- **email.notifications**: Email sending requests
- **inventory.updates**: Stock level changes
