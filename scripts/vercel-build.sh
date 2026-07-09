#!/bin/bash
set -e
echo "=== Building billing client ==="
cd devlopment/client
npm install --no-fund --no-audit
npm run build
echo "=== Done building billing client ==="
ls -la dist/
cd ../..

echo "=== Building main site ==="
npx vite build
echo "=== Done building main site ==="
ls -la dist/

echo "=== Copying billing client to dist/devlopment/ ==="
mkdir -p dist/devlopment
cp -r devlopment/client/dist/* dist/devlopment/
echo "=== Final dist contents ==="
ls -la dist/
ls -la dist/devlopment/
ls -la dist/devlopment/assets/ 2>/dev/null || echo "(no assets dir)"
echo "=== BUILD COMPLETE ==="
