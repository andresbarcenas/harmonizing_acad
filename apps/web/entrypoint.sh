#!/bin/sh
set -e

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  npm install
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
