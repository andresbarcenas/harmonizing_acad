import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { createAvailabilitySchema, deleteAvailabilitySchema, updateAvailabilitySchema } from "@/lib/validators/admin";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createAvailabilitySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await db.teacherProfile.findUnique({
    where: { id: parsed.data.teacherId },
    include: { user: { select: { timezone: true } } },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Docente no encontrado." }, { status: 404 });
  }

  const timezone = normalizeIanaTimezone(teacher.user.timezone);
  const created = await db.teacherAvailability.create({
    data: {
      teacherId: parsed.data.teacherId,
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

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateAvailabilitySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await db.teacherProfile.findUnique({
    where: { id: parsed.data.teacherId },
    include: { user: { select: { timezone: true } } },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Docente no encontrado." }, { status: 404 });
  }

  const timezone = normalizeIanaTimezone(teacher.user.timezone);
  const updated = await db.teacherAvailability.update({
    where: { id: parsed.data.availabilityId },
    data: {
      teacherId: parsed.data.teacherId,
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

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = deleteAvailabilitySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.teacherAvailability.delete({
    where: { id: parsed.data.availabilityId },
  });

  return NextResponse.json({ ok: true });
}
