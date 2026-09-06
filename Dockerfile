# ==========================================
# Multi-stage Dockerfile for pod-PDF Service
# ==========================================

# Stage 1: Build Web GUI
FROM node:18-bullseye-slim AS gui-builder
WORKDIR /app/gui

COPY src/gui/package*.json ./
RUN npm install

COPY src/gui/ ./
RUN npm run build

# Stage 2: Build Backend TypeScript
FROM node:18-bullseye-slim AS backend-builder
WORKDIR /app

COPY package*.json tsconfig*.json ./
RUN npm install

COPY src/ ./src/
RUN npm run build

# Stage 3: Production Runtime
FROM node:18-bullseye-slim AS runner
WORKDIR /app

# Install font libraries for consistent PDF and barcode rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/src/storage/default-templates ./dist/storage/default-templates
COPY --from=gui-builder /app/gui/dist ./src/gui/dist

# Expose microservice HTTP port
EXPOSE 3000

CMD ["node", "dist/index.js"]

