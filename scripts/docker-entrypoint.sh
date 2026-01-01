#!/bin/sh
set -e

echo "🔄 Initializing database schema..."

# This ensures schema syntax compatibility
node ./node_modules/prisma/build/index.js db push

echo "✅ Database schema synchronized!"

# Start the application
echo "🚀 Starting Next.js..."
exec node server.js
