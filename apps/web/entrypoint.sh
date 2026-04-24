#!/bin/sh
set -e

npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
NODE_ENV=production npm run build
NODE_ENV=production npm run start -- --hostname 0.0.0.0 --port 3000
