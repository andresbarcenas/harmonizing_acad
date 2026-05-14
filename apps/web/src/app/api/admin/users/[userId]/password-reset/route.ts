import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { adminPasswordResetSchema } from "@/lib/validators/password";

function message(locale: string | null | undefined, en: string, es: string) {
  return locale === "es" ? es : en;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: message(auth.user.locale, "Use Settings to change your own password.", "Usa Configuración para cambiar tu propia contraseña.") },
      { status: 400 },
    );
  }

  const parsed = adminPasswordResetSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json(
      { error: message(auth.user.locale, "User not found.", "Usuario no encontrado.") },
      { status: 404 },
    );
  }

  // Security-sensitive: admins set a temporary password by replacing only the bcrypt hash.
  const passwordHash = await hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: target.id },
    data: { passwordHash },
  });

  return NextResponse.json({
    ok: true,
    user: target,
  });
}
