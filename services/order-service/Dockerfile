# Order Service Dockerfile
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY ./services/order-service/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY ./services/order-service/ .

# Copy shared modules
COPY ./shared ./shared

# Expose port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4003/health || exit 1

# Start the application
CMD ["npm", "start"]
