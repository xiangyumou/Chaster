#!/bin/sh
set -e

echo "🔄 Waiting for database connection..."
# Wait for the database to be ready
i=0
while ! nc -z db 5432; do
  i=$((i+1))
  if [ $i -gt 30 ]; then
    echo "❌ Database timeout occurred"
    exit 1
  fi
  echo "⏳ Waiting for database at db:5432..."
  sleep 1
done
echo "✅ Database connection established!"

echo "🔄 Initializing database schema..."

# This ensures schema syntax compatibility
node ./node_modules/prisma/build/index.js db push

echo "✅ Database schema synchronized!"

# Start the application
echo "🚀 Starting Next.js..."
exec node server.js
