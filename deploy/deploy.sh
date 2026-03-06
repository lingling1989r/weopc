#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/weopc/weopc"
ARCHIVE_PATH="/home/weopc/weopc-deploy.tar.gz"
TMP_DIR="/home/weopc/weopc-release"

mkdir -p "$APP_DIR"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

echo "==> Extracting uploaded release"
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

if [ -d "$TMP_DIR/weopc" ]; then
  SOURCE_DIR="$TMP_DIR/weopc"
else
  SOURCE_DIR="$TMP_DIR"
fi

find "$APP_DIR" -mindepth 1 -maxdepth 1 \
  ! -name 'apps' \
  ! -name 'deploy' \
  ! -name 'package.json' \
  ! -name 'pnpm-lock.yaml' \
  ! -name 'pnpm-workspace.yaml' \
  ! -name 'turbo.json' \
  ! -name 'packages' \
  ! -name 'tools' \
  -exec rm -rf {} + 2>/dev/null || true

cp -R "$SOURCE_DIR"/* "$APP_DIR"

cd "$APP_DIR"

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

echo "==> Restarting services"
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.js"
pm2 save

echo "==> Cleaning up"
rm -rf "$TMP_DIR" "$ARCHIVE_PATH"

echo "==> Deployment finished"
