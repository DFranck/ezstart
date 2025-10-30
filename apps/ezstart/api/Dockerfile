# Multi-stage build for optimal image size
FROM node:20-alpine AS base
RUN npm install -g pnpm@10.12.2
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/logger/package.json ./packages/logger/
COPY packages/types/package.json ./packages/types/
COPY packages/express-core/package.json ./packages/express-core/
COPY packages/monitoring/package.json ./packages/monitoring/
COPY apps/ezstart/api/package.json ./apps/ezstart/api/
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Stage 2: Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY packages ./packages
COPY apps/ezstart ./apps/ezstart
COPY tsconfig.json ./
COPY turbo.json ./

# Build dependencies first
RUN pnpm --filter @ezstart/config build && \
    pnpm --filter @ezstart/logger build && \
    pnpm --filter @ezstart/monitoring build && \
    pnpm --filter @ezstart/express-core build

# Build the API
RUN pnpm turbo build --filter=api-monitoring

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built files and dependencies
COPY --from=builder /app/apps/ezstart/api/dist ./dist
COPY --from=builder /app/apps/ezstart/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 5000
CMD ["node", "dist/index.js"]
