#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/weopc/weopc"
BRANCH="main"

cd "$APP_DIR"

echo "==> Fetching latest code"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Generating Prisma client"
pnpm --filter @weopc/api prisma:generate

echo "==> Running Prisma migrations"
cd "$APP_DIR/apps/api"
pnpm prisma migrate deploy

cd "$APP_DIR"

echo "==> Building apps"
pnpm -r --filter=@weopc/api --filter=@weopc/web build

echo "==> Syncing PM2 config"
mkdir -p /home/weopc/.pm2
cp "$APP_DIR/deploy/ecosystem.config.js" /home/weopc/weopc/deploy/ecosystem.config.js

echo "==> Restarting services"
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.js"
pm2 save

echo "==> Deployment finished"
