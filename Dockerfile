# =============================================================================
# Multi-stage Dockerfile for React-Playwright Implementation
#
# Target stages:
#   - base: Common dependencies and setup
#   - development: Development environment with hot-reload
#   - production: Optimized production build
#
# Usage:
#   docker build --target development -t es-demo:dev .
#   docker build --target production -t es-demo:prod .
#   docker compose up                    # Uses development target
#   docker compose -f docker-compose.prod.yml up  # Uses production target
# =============================================================================

FROM --platform=linux/amd64 node:20-alpine AS base

# Install dumb-init for proper signal handling and wget for healthcheck
RUN apk add --no-cache dumb-init wget

# Set working directory
WORKDIR /app

# Copy root package files for workspace linking
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

# Copy implementation package files
COPY packages/client/package.json packages/client/pnpm-lock.yaml ./packages/client/

# Install dependencies
# --frozen-lockfile ensures reproducible builds
RUN pnpm install --frozen-lockfile

# =============================================================================
# Development Target
# =============================================================================
FROM base AS development

# Copy all source code
COPY . .

# Set environment for development
ENV NODE_ENV=development
ENV PORT=5173
ENV VITE_HOST=0.0.0.0

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 5173

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start dev server with Vite and API server
CMD ["pnpm", "run", "dev:with-server"]

# =============================================================================
# Production Target
# =============================================================================
FROM base AS build

# Copy all source code
COPY . .

# Build TypeScript
RUN pnpm run build

# =============================================================================
# Production Runtime Image
# =============================================================================
FROM node:20-alpine AS production

# Install dumb-init, wget (for healthcheck), and sqlite3 cli for debugging
RUN apk add --no-cache dumb-init wget sqlite

# Set working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package.json pnpm-lock.yaml ./
COPY packages/client/package.json packages/client/pnpm-lock.yaml ./packages/client/
RUN npm install -g pnpm@9.15.4
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from build stage
COPY --from=build /app/packages/client/dist ./dist
COPY --chown=nodejs:nodejs --from=build /app/node_modules ./node_modules

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

# Set environment for production
ENV NODE_ENV=production
ENV PORT=5173

# Create a non-root user for running the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5173/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server/standalone.js"]
