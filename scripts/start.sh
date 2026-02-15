#!/bin/sh
set -e

# Run migrations on startup (creates DB if it doesn't exist)
npx prisma migrate deploy

# Start the Next.js server
node server.js
