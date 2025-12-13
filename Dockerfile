# Multi-stage build for production deployment
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy package files, patches, stubs, and scripts (needed for pnpm install)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
COPY stubs/ ./stubs/
COPY scripts/ ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy package files, patches, stubs, and scripts
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
COPY stubs/ ./stubs/
COPY scripts/ ./scripts/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start application
CMD ["node", "dist/index.js"]
