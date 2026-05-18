import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

const createBlackoutSchema = z.object({
  teacherId: z.string().min(1),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  note: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(500).optional()),
});

const deleteBlackoutSchema = z.object({ blackoutId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createBlackoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await db.teacherProfile.findUnique({
    where: { id: parsed.data.teacherId },
    include: { user: { select: { timezone: true } } },
  });
  if (!teacher) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Docente no encontrada." : "Teacher not found." }, { status: 404 });
  }

  const timezone = normalizeIanaTimezone(teacher.user.timezone);
  const blackout = await db.teacherBlackoutDate.upsert({
    where: { teacherId_localDate: { teacherId: teacher.id, localDate: parsed.data.localDate } },
    update: { timezone, note: parsed.data.note },
    create: { teacherId: teacher.id, localDate: parsed.data.localDate, timezone, note: parsed.data.note },
  });

  return NextResponse.json({ blackout });
}

export async function DELETE(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = deleteBlackoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.teacherBlackoutDate.delete({ where: { id: parsed.data.blackoutId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
