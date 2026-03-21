#!/bin/bash

echo "🚀 Starting NEST Platform Development Environment"
echo "================================================"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first."
    echo "   You can use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16"
fi

# Check if Redis is running
if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis is not running. Please start Redis first."
    echo "   You can use Docker: docker run -d -p 6379:6379 redis:7-alpine"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🗄️  Setting up database..."
cd apps/api
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit apps/api/.env with your API keys"
fi

# Generate Prisma client
pnpm db:generate

# Run migrations (if needed)
pnpm db:migrate || echo "⚠️  Database migrations may need manual setup"

echo ""
echo "🔧 Building projects..."
cd ../..
pnpm build

echo ""
echo "🌐 Starting development servers..."
echo "   API: http://localhost:3001"
echo "   Web: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Start both servers in parallel
pnpm dev
