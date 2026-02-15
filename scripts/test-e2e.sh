#!/usr/bin/env bash
set -euo pipefail

TEST_PORT=3001

# Use a separate test database so dev data is never touched
export DATABASE_URL="file:./test.db"

# Remove stale test database
rm -f prisma/test.db prisma/test.db-journal prisma/test.db-wal

# Generate client and migrate the test database, then seed
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts

# Stop any existing dev server so the .next/dev/lock is released
DEV_WAS_RUNNING=""
DEV_PID=$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t 2>/dev/null || true)
if [ -n "$DEV_PID" ]; then
  echo "Stopping dev server (pid $DEV_PID) to release .next/dev/lock..."
  DEV_WAS_RUNNING="1"
  kill "$DEV_PID" 2>/dev/null || true
  sleep 1
fi

# Start test server in the background
npx next dev --port "$TEST_PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  # Restart dev server if it was running before tests
  if [ -n "$DEV_WAS_RUNNING" ]; then
    echo "Restarting dev server on port 3000..."
    npx next dev --port 3000 &
    disown
  fi
}
trap cleanup EXIT

# Wait for the server to be ready
echo "Waiting for test server on port $TEST_PORT..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$TEST_PORT"; then
    break
  fi
  sleep 1
done

# Run Playwright tests
npx playwright test "$@"
