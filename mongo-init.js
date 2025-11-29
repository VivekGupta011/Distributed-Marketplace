// MongoDB initialization script for Docker
db = db.getSiblingDB('ecommerce_microservices');

// Create collections
db.createCollection('users');
db.createCollection('products');
db.createCollection('orders');
db.createCollection('inventories');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });

db.products.createIndex({ "name": 1 });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "isActive": 1 });

db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "orderNumber": 1 }, { unique: true });
db.orders.createIndex({ "status": 1 });

db.inventories.createIndex({ "productId": 1 }, { unique: true });
db.inventories.createIndex({ "currentStock": 1 });

print('Database initialized successfully!');
