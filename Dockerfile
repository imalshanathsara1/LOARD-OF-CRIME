
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create auth directory with proper permissions
RUN mkdir -p /app/auth && chmod 755 /app/auth

# Expose port (Render uses dynamic ports)
EXPOSE $PORT

# Health check with proper port variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://0.0.0.0:${PORT:-5000}/health || exit 1

# Start the application
CMD ["node", "index.js"]
