#!/bin/bash

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Fallback values if variables are empty
POSTGRES_USER=${POSTGRES_USER:-tce_user}
POSTGRES_DB=${POSTGRES_DB:-tce_bonafide}
REDIS_PASSWORD=${REDIS_PASSWORD:-tce_redis_secure_password}

echo "=========================================================="
echo "   TCE Bonafide Certificate Portal - Start Script"
echo "=========================================================="

# 1. Spin up Postgres & Redis containers
echo "[1/5] Starting database and cache Docker containers..."
docker compose up -d

# 2. Wait for Postgres to be ready on port 5434
echo "[2/5] Waiting for PostgreSQL database to accept connections..."
until docker exec tce_postgres_primary pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 1
done
echo "      --> PostgreSQL is healthy and accepting connections!"

# 3. Verify Redis is up and pinging
echo "[3/5] Waiting for Redis cache to initialize..."
until docker exec tce_redis redis-cli -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; do
  sleep 1
done
echo "      --> Redis is healthy and accepting queries!"

# 4. Seed database schema if tables don't exist
echo "[4/5] Applying PostgreSQL database schemas..."
docker exec -i tce_postgres_primary psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/schema.sql

# 5. Start microservices and frontend in parallel
echo "[5/5] Launching microservices and React frontend locally..."
echo "      --> Press Ctrl+C at any time to shut down all processes cleanly."

# Start student-service
cd services/student-service
npm run dev &
STUDENT_PID=$!
cd ../..

# Start admin-service
cd services/admin-service
npm run dev &
ADMIN_PID=$!
cd ../..

# Start dev-service
cd services/dev-service
npm run dev &
DEV_PID=$!
cd ../..

# Start frontend Vite server
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Graceful shutdown handler
cleanup() {
  echo ""
  echo "=========================================================="
  echo "   Stopping all microservices and frontend server..."
  echo "=========================================================="
  kill $STUDENT_PID 2>/dev/null || true
  kill $ADMIN_PID 2>/dev/null || true
  kill $DEV_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

# Trap termination signals
trap cleanup SIGINT SIGTERM

# Keep the script running to show logs and catch Ctrl+C
wait
