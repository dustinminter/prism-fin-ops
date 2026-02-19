# ============================================================================
# PRISM FinOps - Backend Dockerfile for SPCS
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY server ./server
COPY shared ./shared
COPY tsconfig.json ./

# Build the production server with explicit externals (not --packages=external)
# This bundles @shared/* but externalizes actual npm packages
RUN npx esbuild server/_core/index.prod.ts --platform=node --bundle --format=esm --outdir=dist \
    --alias:@shared/const=./shared/const.ts \
    --alias:@shared/types=./shared/types.ts \
    --external:express \
    --external:dotenv \
    --external:@trpc/server \
    --external:snowflake-sdk \
    --external:zod \
    --external:nanoid \
    --external:superjson

# ============================================================================
# Production stage
# ============================================================================

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built server from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Environment variables (overridden by SPCS spec)
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.prod.js"]
