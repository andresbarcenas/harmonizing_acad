import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { detectTimezoneFromHeaders } from "@/lib/timezone";
import { viewerTimezoneSchema } from "@/lib/validators/viewer";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = viewerTimezoneSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const timezone = detectTimezoneFromHeaders(parsed.data.timezone);
  await db.user.update({
    where: { id: auth.user.id },
    data: { timezone },
  });

  return NextResponse.json({ ok: true, timezone });
}

