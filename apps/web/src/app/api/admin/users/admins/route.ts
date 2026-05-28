import { Prisma, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { createAdminSchema } from "@/lib/validators/admin";

export async function POST(req: Request) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const parsed = createAdminSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
  }

  try {
    const passwordHash = await hash(data.temporaryPassword, 12);
    const admin = await db.user.create({
      data: {
        name: data.name.trim(),
        email: data.email,
        passwordHash,
        role: Role.ADMIN,
        timezone: normalizeIanaTimezone(data.timezone ?? auth.user.timezone),
        locale: data.locale && data.locale !== "browser" ? data.locale : null,
      },
      select: { id: true, name: true, email: true, role: true, timezone: true, locale: true, createdAt: true },
    });

    return NextResponse.json({ admin });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo crear el admin." : "Could not create admin." }, { status: 500 });
  }
}
