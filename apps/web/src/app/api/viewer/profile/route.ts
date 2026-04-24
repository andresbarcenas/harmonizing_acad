import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { viewerProfileSchema } from "@/lib/validators/viewer";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = viewerProfileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { image: parsed.data.image },
    select: { image: true },
  });

  return NextResponse.json({ ok: true, image: user.image });
}
