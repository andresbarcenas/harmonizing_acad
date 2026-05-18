#!/bin/sh
set -e

APP_RUNTIME="${APP_RUNTIME:-dev}"

PACKAGE_LOCK_HASH="$(sha256sum package-lock.json 2>/dev/null | awk '{print $1}')"
INSTALLED_LOCK_HASH="$(cat node_modules/.package-lock.hash 2>/dev/null || true)"

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ] || [ "$PACKAGE_LOCK_HASH" != "$INSTALLED_LOCK_HASH" ]; then
  npm install
  if [ -n "$PACKAGE_LOCK_HASH" ]; then
    echo "$PACKAGE_LOCK_HASH" > node_modules/.package-lock.hash
  fi
fi

npm run prisma:generate
npm run prisma:migrate

if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  npm run prisma:seed
fi

case "$APP_RUNTIME" in
  dev)
    echo "Starting Harmonizing web in Docker development mode with Next.js hot reload."
    exec npm run dev -- --hostname 0.0.0.0 --port 3000
    ;;
  start)
    if [ ! -f .next/BUILD_ID ]; then
      echo "Missing .next build artifacts. Run 'docker compose exec web npm run build' or 'cd apps/web && npm run build', then restart with APP_RUNTIME=start."
      exit 1
    fi
    echo "Starting Harmonizing web in production-like local mode."
    exec npm run start -- --hostname 0.0.0.0 --port 3000
    ;;
  *)
    echo "Unsupported APP_RUNTIME='$APP_RUNTIME'. Use 'dev' or 'start'."
    exit 1
    ;;
esac
