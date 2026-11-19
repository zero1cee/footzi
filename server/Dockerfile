# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy server source code and build config
COPY tsconfig*.json ./
COPY src/ ./src/
COPY public/ ./public/

# Compile TypeScript to JavaScript in dist/
RUN npm run build

# Prune devDependencies to keep container minimal
RUN npm prune --production

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Copy production artifacts
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Run as non-root user for security
USER node

EXPOSE 5001

CMD ["node", "dist/server.js"]
