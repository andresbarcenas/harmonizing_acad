import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { deleteAvailabilitySchema } from "@/lib/validators/admin";

const teacherCreateAvailabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinuteLocal: z.number().int().min(0).max(23 * 60 + 59),
  endMinuteLocal: z.number().int().min(1).max(24 * 60),
}).refine((value) => value.endMinuteLocal > value.startMinuteLocal, {
  message: "Rango de horario inválido",
  path: ["endMinuteLocal"],
});

const teacherUpdateAvailabilitySchema = z.object({
  availabilityId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  startMinuteLocal: z.number().int().min(0).max(23 * 60 + 59),
  endMinuteLocal: z.number().int().min(1).max(24 * 60),
}).refine((value) => value.endMinuteLocal > value.startMinuteLocal, {
  message: "Rango de horario inválido",
  path: ["endMinuteLocal"],
});

function forbidden(locale = "en") {
  return NextResponse.json({ error: locale === "es" ? "No tienes permisos para gestionar esta disponibilidad." : "You do not have permission to manage this availability." }, { status: 403 });
}

async function getTeacherProfile(authUser: {
  role: Role;
  locale: string;
  teacherProfile?: { id: string } | null;
}) {
  if (authUser.role !== Role.TEACHER || !authUser.teacherProfile?.id) return null;
  return db.teacherProfile.findUnique({
    where: { id: authUser.teacherProfile.id },
    include: { user: { select: { timezone: true } } },
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const teacher = await getTeacherProfile(auth.user);
  if (!teacher) return forbidden(auth.user.locale);

  const parsed = teacherCreateAvailabilitySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const timezone = normalizeIanaTimezone(teacher.user.timezone);
  const created = await db.teacherAvailability.create({
    data: {
      teacherId: teacher.id,
      weekday: parsed.data.weekday,
      startMinuteLocal: parsed.data.startMinuteLocal,
      endMinuteLocal: parsed.data.endMinuteLocal,
      timezone,
    },
  });

  return NextResponse.json({ availability: created });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const teacher = await getTeacherProfile(auth.user);
  if (!teacher) return forbidden(auth.user.locale);

  const parsed = teacherUpdateAvailabilitySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.teacherAvailability.findUnique({ where: { id: parsed.data.availabilityId }, select: { teacherId: true } });
  if (!existing || existing.teacherId !== teacher.id) return forbidden(auth.user.locale);

  const timezone = normalizeIanaTimezone(teacher.user.timezone);
  const updated = await db.teacherAvailability.update({
    where: { id: parsed.data.availabilityId },
    data: {
      weekday: parsed.data.weekday,
      startMinuteLocal: parsed.data.startMinuteLocal,
      endMinuteLocal: parsed.data.endMinuteLocal,
      timezone,
    },
  });

  return NextResponse.json({ availability: updated });
}

export async function DELETE(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const teacher = await getTeacherProfile(auth.user);
  if (!teacher) return forbidden(auth.user.locale);

  const parsed = deleteAvailabilitySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.teacherAvailability.findUnique({ where: { id: parsed.data.availabilityId }, select: { teacherId: true } });
  if (!existing || existing.teacherId !== teacher.id) return forbidden(auth.user.locale);

  await db.teacherAvailability.delete({ where: { id: parsed.data.availabilityId } });

  return NextResponse.json({ ok: true });
}
