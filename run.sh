#!/bin/bash

echo "=========================================================="
echo "   TCE Bonafide Certificate Portal - Start Script"
echo "=========================================================="

# 1. Spin up Postgres & Redis containers
echo "[1/5] Starting database and cache Docker containers..."
docker compose up -d

# 2. Wait for Postgres to be ready on port 5434
echo "[2/5] Waiting for PostgreSQL database to accept connections..."
until docker exec tce_postgres_primary pg_isready -U tce_user -d tce_bonafide >/dev/null 2>&1; do
  sleep 1
done
echo "      --> PostgreSQL is healthy and accepting connections!"

# 3. Verify Redis is up and pinging
echo "[3/5] Waiting for Redis cache to initialize..."
until docker exec tce_redis redis-cli -a tce_redis_secure_password ping >/dev/null 2>&1; do
  sleep 1
done
echo "      --> Redis is healthy and accepting queries!"

# 4. Seed database schema if tables don't exist
echo "[4/5] Applying PostgreSQL database schemas..."
docker exec -i tce_postgres_primary psql -U tce_user -d tce_bonafide < db/schema.sql

# 5. Start servers in parallel
echo "[5/5] Launching backend Express API & frontend Vite servers..."
echo "      --> Press Ctrl+C at any time to shut down both servers cleanly."

# Start backend server
npm start &
BACKEND_PID=$!

# Start frontend Vite server
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# Graceful shutdown handler
cleanup() {
  echo ""
  echo "=========================================================="
  echo "   Stopping backend and frontend servers..."
  echo "=========================================================="
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

# Trap termination signals
trap cleanup SIGINT SIGTERM

# Keep the script running to show logs and catch Ctrl+C
wait
