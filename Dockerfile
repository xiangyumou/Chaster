# Build Stage
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including dev deps for build)
RUN npm ci

# Copy source files
COPY . .

# Build the Next.js application
RUN npm run build

# Runner Stage
FROM node:22-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=PRODUCTION

# Install production build dependencies for better-sqlite3 (runtime needs it if it wasn't pre-built for the target architecture, but slim should be fine if we copy correctly. However, to be safe for better-sqlite3, we might need some libs)
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create data directory
RUN mkdir -p /app/data

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
