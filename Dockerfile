# Multi-stage build for Financial Advisor

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy client files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY client/ .

# Build
RUN npm run build

# Stage 2: Build backend with Python
FROM node:18-alpine

# Install Python and build tools
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    python3-dev

WORKDIR /app

# Copy server files
COPY server/package*.json ./

# Install Node dependencies
RUN npm install

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy server source
COPY server/ .

# Copy ML models and data
COPY ML/ ../ML/

# Copy built frontend
COPY --from=frontend-builder /app/client/build ./public

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["npm", "start"]
