import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

import { syncDefaultSkills } from "../src/lib/skills/sync-defaults";

loadEnvConfig(process.cwd());

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.MIGRATION_DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
} else {
  console.error("No database URL found. Set DATABASE_URL, MIGRATION_DATABASE_URL, DATABASE_URL_UNPOOLED, or POSTGRES_URL_NON_POOLING.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const overwriteDefaults = process.argv.includes("--overwrite-defaults");
  const result = await syncDefaultSkills(prisma, { overwriteDefaults });

  console.log("Default skills sync complete.");
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Skipped: ${result.skipped}`);

  for (const row of result.rows) {
    console.log(`${row.action.padEnd(7)} ${row.instrument.padEnd(7)} ${row.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
