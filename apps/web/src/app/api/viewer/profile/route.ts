import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { viewerProfileSchema } from "@/lib/validators/viewer";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.isImpersonating) {
    return NextResponse.json(
      {
        error: auth.user.locale === "es"
          ? "Los cambios de perfil están desactivados durante la suplantación docente."
          : "Profile changes are disabled while impersonating a teacher.",
      },
      { status: 403 },
    );
  }

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
