#!/bin/sh
set -e

npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev -- --hostname 0.0.0.0 --port 3000
