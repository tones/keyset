#!/bin/sh
set -e

# Pull the production database from Fly.io and overwrite the local dev database.
# Usage: npm run db:pull

APP="keyset-app"
REMOTE_PATH="/data/keyset.db"
LOCAL_PATH="dev.db"

echo "Pulling production database from Fly.io ($APP)..."
rm -f "$LOCAL_PATH"
fly ssh sftp get "$REMOTE_PATH" "$LOCAL_PATH" --app "$APP"
echo "Done. Local database at $LOCAL_PATH has been replaced with production data."

# Restart dev server so it picks up the new database
DEV_PID=$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t 2>/dev/null)
if [ -n "$DEV_PID" ]; then
  echo "Restarting dev server (pid $DEV_PID)..."
  kill "$DEV_PID" 2>/dev/null
  sleep 1
  rm -f .next/dev/lock
  nohup npx next dev --port 3000 > /dev/null 2>&1 &
  echo "Dev server restarted on port 3000."
else
  echo "No dev server running on port 3000. Start one with: npm run dev"
fi
