#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync } = require("node:child_process");

const candidates = [
  ["MIGRATION_DATABASE_URL", process.env.MIGRATION_DATABASE_URL],
  ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
  ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
  ["DATABASE_URL", process.env.DATABASE_URL],
];

const selected = candidates.find(([, value]) => value?.trim());

if (!selected) {
  console.error("No database URL found. Set DATABASE_URL or a direct migration URL.");
  process.exit(1);
}

const [sourceName, databaseUrl] = selected;
const isLikelyPooledNeonUrl = /-pooler\./.test(databaseUrl) || /[?&]pgbouncer=true\b/.test(databaseUrl);

if (isLikelyPooledNeonUrl) {
  console.error(
    [
      `Refusing to run Prisma migrations with pooled ${sourceName}.`,
      "Set DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING, or MIGRATION_DATABASE_URL to a direct Neon connection string.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`Running Prisma migrations with ${sourceName}.`);

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
