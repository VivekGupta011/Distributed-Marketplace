# 🚀 Complete Nginx API Gateway Setup Guide

## 📋 Prerequisites
- macOS with Homebrew installed
- Docker and Docker Compose installed
- Your microservices project ready

## 🔧 Step 1: Install Nginx (One-time setup)

```bash
# Install nginx using Homebrew
brew install nginx

# Start nginx service
brew services start nginx

# Verify installation
nginx -v
brew services list | grep nginx
```

## 📁 Step 2: Locate Nginx Files

```bash
# Main configuration file (this is what we modify)
/opt/homebrew/etc/nginx/nginx.conf

# Nginx directory
/opt/homebrew/etc/nginx/

# Check current config
cat /opt/homebrew/etc/nginx/nginx.conf
```

## 💾 Step 3: Always Backup First!

```bash
# Create backup before any changes
cp /opt/homebrew/etc/nginx/nginx.conf /opt/homebrew/etc/nginx/nginx.conf.backup

# If something goes wrong, restore with:
# cp /opt/homebrew/etc/nginx/nginx.conf.backup /opt/homebrew/etc/nginx/nginx.conf
```

## ⚙️ Step 4: Configure API Gateway

### Replace the entire nginx.conf content with this configuration:

```nginx
#user  nobody;
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # --------- Upstreams (microservices) ----------
    upstream user_service {
        server localhost:4001;
    }

    upstream product_service {
        server localhost:4002;
    }

    upstream order_service {
        server localhost:4003;
    }

    upstream inventory_service {
        server localhost:4004;
    }

    # --------- API Gateway Server ---------------
    server {
        listen       8080;  
        server_name  localhost;  

        # -------- Root Health (Gateway) ----------
        location = / {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            default_type application/json;
            return 200 '{"success": true, "message": "E-commerce API Gateway is running on port 8080", "services": {"user": "/api/users", "product": "/api/products", "order": "/api/orders", "inventory": "/api/inventory"}}';
        }

        # -------- User Service ----------
        location /api/users/ {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            proxy_pass http://user_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # -------- Product Service ----------
        location /api/products/ {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            proxy_pass http://product_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # -------- Order Service ----------
        location /api/orders/ {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            proxy_pass http://order_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # -------- Inventory Service ----------
        location /api/inventory/ {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            proxy_pass http://inventory_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # -------- Health of individual services ----------
        location = /health/users {
            add_header 'Access-Control-Allow-Origin' '*' always;
            proxy_pass http://user_service/health;
        }

        location = /health/products {
            add_header 'Access-Control-Allow-Origin' '*' always;
            proxy_pass http://product_service/health;
        }

        location = /health/orders {
            add_header 'Access-Control-Allow-Origin' '*' always;
            proxy_pass http://order_service/health;
        }

        location = /health/inventory {
            add_header 'Access-Control-Allow-Origin' '*' always;
            proxy_pass http://inventory_service/health;
        }

        # -------- Catch-all for unknown /api/*
        location /api/ {
            add_header 'Access-Control-Allow-Origin' '*' always;
            default_type application/json;
            return 404 '{"success": false, "message": "API endpoint not found", "available_endpoints": ["/api/users", "/api/products", "/api/orders", "/api/inventory"]}';
        }

        # -------- Error pages ----------
        error_page 404 = /__json_404;
        error_page 500 502 503 504 = /__json_50x;

        location = /__json_404 {
            add_header 'Access-Control-Allow-Origin' '*' always;
            default_type application/json;
            return 404 '{"success": false, "message": "Page not found"}';
        }

        location = /__json_50x {
            add_header 'Access-Control-Allow-Origin' '*' always;
            default_type application/json;
            return 500 '{"success": false, "message": "Internal server error"}';
        }
    }

    include servers/*;
}
```

## 🧪 Step 5: Test Configuration

```bash
# Test nginx configuration syntax
nginx -t

# If test passes, reload nginx
brew services restart nginx
# OR
nginx -s reload
```

## 🐳 Step 6: Modify Docker Compose (Remove Express Gateway)

In your `docker-compose.yml`, remove or comment out:
- The `api-gateway` service 
- The `redis` service (if not needed)
- The `redis_data` volume

Keep only your microservices and MongoDB.

## 🚀 Step 7: Start Your Project

```bash
# Start microservices
docker-compose up -d

# Check status
docker-compose ps

# Test gateway
curl http://localhost:8080/
curl http://localhost:8080/health/users
```

## 🔧 Step 8: Verify Everything Works

### Test URLs:
- **Gateway Health**: `http://localhost:8080/`
- **User Service**: `http://localhost:8080/api/users/`
- **Product Service**: `http://localhost:8080/api/products/`
- **Order Service**: `http://localhost:8080/api/orders/`
- **Inventory Service**: `http://localhost:8080/api/inventory/`

### Health Checks:
- `http://localhost:8080/health/users`
- `http://localhost:8080/health/products`
- `http://localhost:8080/health/orders`
- `http://localhost:8080/health/inventory`

## 🔄 Daily Usage Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Check logs
docker-compose logs -f user-service

# Restart nginx (if config changes)
brew services restart nginx
```

## 🛠️ Troubleshooting

### If nginx won't start:
```bash
# Check syntax
nginx -t

# Check what's using port 8080
lsof -i :8080

# Kill process on port 8080 if needed
sudo kill -9 $(lsof -t -i:8080)
```

### If services can't connect:
```bash
# Check if Docker services are running
docker-compose ps

# Check individual service health
curl http://localhost:4001/health
curl http://localhost:4002/health
```

## 📝 Important Files

### ✅ Files You Need:
- `/opt/homebrew/etc/nginx/nginx.conf` - Main nginx config
- `/opt/homebrew/etc/nginx/nginx.conf.backup` - Your backup
- `docker-compose.yml` - Your microservices

### ❌ Files You DON'T Need:
- Any files in `/tmp/nginx_*` (temporary)
- Old nginx config files in your project directory

## 🎯 Summary

1. **Install nginx once**: `brew install nginx`
2. **Backup config**: Always backup before changes
3. **Replace nginx.conf**: Use the configuration above
4. **Test config**: `nginx -t`
5. **Restart nginx**: `brew services restart nginx`
6. **Start Docker services**: `docker-compose up -d`
7. **Test everything**: Use curl or Postman

**Your Postman collections will work exactly the same, just point them to `http://localhost:8080`!**
