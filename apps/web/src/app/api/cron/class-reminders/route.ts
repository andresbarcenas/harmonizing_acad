import { NextResponse } from "next/server";

import { sendDueClassReminders } from "@/lib/email/class-reminders";

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handler(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueClassReminders();
  return NextResponse.json(result);
}

export const GET = handler;
export const POST = handler;
