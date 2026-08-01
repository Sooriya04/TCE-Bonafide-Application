#!/bin/bash
# Exit on any error
set -e

echo "=========================================================="
echo "   TCE Bonafide Certificate Portal - Setup Script"
echo "=========================================================="

# 1. Create environment file if missing
if [ ! -f .env ]; then
  echo "[1/5] Creating environment file from template (.env.example)..."
  cp .env.example .env
  echo "      --> Note: Please configure your .env variables before running the portal."
else
  echo "[1/5] .env file already exists, skipping."
fi

# 2. Create directory structures
echo "[2/5] Creating diagnostics directories..."
mkdir -p logs reports

# 3. Pull required Docker containers
echo "[3/5] Pulling database containers (PostgreSQL & Redis)..."
docker compose pull

# 4. Install backend dependencies
echo "[4/5] Installing Express node modules..."
npm install

# 5. Install frontend dependencies
echo "[5/5] Installing Vite React node modules..."
cd client
npm install
cd ..

echo "=========================================================="
echo "   Setup Complete!"
echo "   Next steps:"
echo "   1. Configure secrets in your local .env file"
echo "   2. Run './build.sh' to compile the React client"
echo "   3. Run './run.sh' to launch PostgreSQL, Redis, and servers"
echo "=========================================================="
