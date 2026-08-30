#!/bin/sh
# 容器启动入口:先同步表结构,再(可选)写演示数据,最后启动应用
set -e

echo "[entrypoint] prisma db push ..."
npx prisma db push --skip-generate

if [ "$SEED_ON_START" = "1" ]; then
  echo "[entrypoint] seeding demo data (SEED_ON_START=1) ..."
  npm run db:seed || echo "[entrypoint] seed failed/skipped (可能已存在)"
fi

exec "$@"
