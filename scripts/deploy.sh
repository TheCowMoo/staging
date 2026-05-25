#!/usr/bin/env sh
set -euo pipefail

# Deploy from git to the current staging working tree.
# Run this from the server environment where /home/ubuntu/staging is checked out.

cd "$(dirname "$0")/.."

echo "=== Safeguard deploy starting ==="

echo "-> Fetching latest origin/main"
git fetch origin

echo "-> Resetting working tree to origin/main"
git reset --hard origin/main

echo "-> Installing dependencies (including dev dependencies)"
pnpm install --force --dev

echo "-> Building frontend + backend"
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=2048" pnpm build

echo "-> Restarting PM2 app"
pm2 stop safeguard >/dev/null 2>&1 || true
pm2 delete safeguard >/dev/null 2>&1 || true
pm2 start dist/index.js --name safeguard --cwd "$PWD" --update-env

echo "=== Safeguard deploy complete ==="
