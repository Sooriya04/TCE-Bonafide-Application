#!/bin/bash
# Exit on any error
set -e

echo "=========================================================="
echo "   TCE Bonafide Certificate Portal - Build Script"
echo "=========================================================="

# 1. Clean existing frontend build
echo "[1/2] Cleaning previous distribution files..."
rm -rf client/dist

# 2. Build Vite React app
echo "[2/2] Compiling Vite React frontend for production..."
cd client
npm run build
cd ..

echo "=========================================================="
echo "   Build Successful!"
echo "   Next steps:"
echo "   1. Run './run.sh' to launch databases and servers"
echo "=========================================================="
