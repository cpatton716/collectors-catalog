#!/bin/bash

# Smoke test: Start production server and verify homepage loads
# Run after `npm run build` to catch runtime errors

set -e

PORT=3099
MAX_WAIT=30

echo "Starting production server on port $PORT..."

# Start server in background
PORT=$PORT npm run start &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to be ready..."
for i in $(seq 1 $MAX_WAIT); do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" | grep -q "200"; then
    echo "✓ Server is ready"
    break
  fi
  if [ $i -eq $MAX_WAIT ]; then
    echo "❌ Server failed to start within $MAX_WAIT seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Test homepage
echo "Testing homepage..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/")

# Cleanup
kill $SERVER_PID 2>/dev/null || true

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Homepage returned 200 OK"
  exit 0
else
  echo "❌ Homepage returned $HTTP_CODE (expected 200)"
  exit 1
fi
