import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { passwordChangeSchema } from "@/lib/validators/password";

function message(locale: string | null | undefined, en: string, es: string) {
  return locale === "es" ? es : en;
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = passwordChangeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: message(auth.user.locale, "Account not found.", "No encontramos esta cuenta.") },
      { status: 404 },
    );
  }

  const allowPasswordSetupWithoutCurrent = auth.user.authMethod === "magic-link";

  if (!allowPasswordSetupWithoutCurrent) {
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: message(auth.user.locale, "This account does not have a password configured.", "Esta cuenta no tiene contraseña configurada.") },
        { status: 400 },
      );
    }

    if (!parsed.data.currentPassword) {
      return NextResponse.json(
        { error: message(auth.user.locale, "Enter your current password.", "Ingresa tu contraseña actual.") },
        { status: 400 },
      );
    }

    // Security-sensitive: verify the current password before replacing the stored bcrypt hash.
    const currentPasswordMatches = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!currentPasswordMatches) {
      return NextResponse.json(
        { error: message(auth.user.locale, "Current password is incorrect.", "La contraseña actual no es correcta.") },
        { status: 400 },
      );
    }
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
