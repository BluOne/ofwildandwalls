# ── Build Stage ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for TypeScript build)
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# ── Production Stage ──
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies and db-migrate for automated migrations
RUN npm ci --omit=dev && npm install -g db-migrate db-migrate-mysql


# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Copy static assets, views, migrations and configuration required at runtime
COPY views/ ./views/
COPY public/ ./public/
COPY config/ ./config/
COPY migrations/ ./migrations/

# Expose port
EXPOSE 3000

# Run database migrations if DB_HOST is provided, then start server
CMD ["sh", "-c", "if [ -n \"$DB_HOST\" ]; then npx db-migrate up --config=config/database.json -e dev || true; fi && npm start"]

