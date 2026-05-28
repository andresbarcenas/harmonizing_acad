import { subDays } from "date-fns";

import { db } from "../src/lib/db";

function daysArg() {
  const arg = process.argv.find((value) => value.startsWith("--days="));
  const parsed = Number(arg?.split("=")[1] ?? process.env.LOGIN_ACTIVITY_RETENTION_DAYS ?? 180);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 180;
}

async function main() {
  const days = daysArg();
  const cutoff = subDays(new Date(), days);
  const result = await db.userLoginActivity.deleteMany({ where: { createdAt: { lt: cutoff } } });
  console.log(JSON.stringify({ retentionDays: days, cutoff: cutoff.toISOString(), deleted: result.count }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
