#!/bin/sh
set -e

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

if [ ! -f .next/BUILD_ID ]; then
  echo "Missing .next build artifacts. Run 'cd apps/web && npm run build' on host, then restart docker compose."
  exit 1
fi

npm run start -- --hostname 0.0.0.0 --port 3000
