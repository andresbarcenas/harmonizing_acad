import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

const createBlackoutSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  note: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(500).optional()),
});

const deleteBlackoutSchema = z.object({ blackoutId: z.string().min(1) });

function forbidden(locale = "en") {
  return NextResponse.json({ error: locale === "es" ? "No tienes permisos para gestionar este día." : "You do not have permission to manage this day." }, { status: 403 });
}

async function getTeacher(authUser: { role: Role; locale: string; teacherProfile?: { id: string } | null }) {
  if (authUser.role !== Role.TEACHER || !authUser.teacherProfile?.id) return null;
  return db.teacherProfile.findUnique({
    where: { id: authUser.teacherProfile.id },
    include: { user: { select: { timezone: true } } },
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const teacher = await getTeacher(auth.user);
  if (!teacher) return forbidden(auth.user.locale);

  const parsed = createBlackoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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

  const teacher = await getTeacher(auth.user);
  if (!teacher) return forbidden(auth.user.locale);

  const parsed = deleteBlackoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.teacherBlackoutDate.findUnique({
    where: { id: parsed.data.blackoutId },
    select: { teacherId: true },
  });
  if (!existing || existing.teacherId !== teacher.id) return forbidden(auth.user.locale);

  await db.teacherBlackoutDate.delete({ where: { id: parsed.data.blackoutId } });
  return NextResponse.json({ ok: true });
}
