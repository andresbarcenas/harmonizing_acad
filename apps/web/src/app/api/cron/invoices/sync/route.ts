import { NextResponse } from "next/server";

import { syncAllStudentsInvoices } from "@/lib/invoices/sync";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const customSecret = request.headers.get("x-cron-secret");
  if (customSecret === secret) return true;

  return false;
}

async function runSync(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await syncAllStudentsInvoices();
  return NextResponse.json({ ok: true, run });
}

export async function GET(req: Request) {
  return runSync(req);
}

export async function POST(req: Request) {
  return runSync(req);
}
