import { NextResponse } from "next/server";
import { NotificationType, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
import { buildUtcClassWindow } from "@/lib/scheduling";
import { createClassRequestSchema } from "@/lib/validators/class-scheduling";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT || !auth.user.studentProfile) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solo estudiantes pueden solicitar clases." : "Only students can request classes." }, { status: 403 });
  }

  const parsed = createClassRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const assignment = await db.teacherAssignment.findUnique({
    where: { studentId: auth.user.studentProfile.id },
    include: { teacher: { include: { user: true } }, student: { include: { user: true } } },
  });

  if (!assignment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes docente asignada para solicitar una clase." : "You do not have an assigned teacher for a class request." }, { status: 400 });
  }

  if (payload.teacherId && payload.teacherId !== assignment.teacherId) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solo puedes solicitar clase con tu docente asignada." : "You can only request a class with your assigned teacher." }, { status: 403 });
  }

  const window = buildUtcClassWindow({
    date: payload.date,
    startTimeLocal: payload.startTimeLocal,
    timezone: payload.timezone,
    durationMin: payload.durationMin,
  });

  if (
    Number.isNaN(window.startsAtUtc.getTime()) ||
    Number.isNaN(window.endsAtUtc.getTime()) ||
    window.startsAtUtc >= window.endsAtUtc ||
    window.startsAtUtc <= new Date() ||
    payload.durationMin < 15 ||
    payload.durationMin > 180
  ) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Horario solicitado inválido." : "Invalid requested time." }, { status: 400 });
  }

  const studentOverlap = await db.classSession.findFirst({
    where: {
      studentId: auth.user.studentProfile.id,
      status: { not: SessionStatus.CANCELLED },
      startsAtUtc: { lt: window.endsAtUtc },
      endsAtUtc: { gt: window.startsAtUtc },
    },
    select: { id: true },
  });

  if (studentOverlap) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Ya tienes una clase en ese horario." : "You already have a class at that time." }, { status: 409 });
  }

  const classRequest = await db.classRequest.create({
    data: {
      studentId: auth.user.studentProfile.id,
      teacherId: assignment.teacherId,
      requestedByUserId: auth.user.id,
      type: payload.type,
      preferredStartUtc: window.startsAtUtc,
      preferredEndUtc: window.endsAtUtc,
      timezone: window.timezone,
      durationMin: payload.durationMin,
      studentMessage: payload.studentMessage,
    },
  });

  const admins = await db.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
  const isSpanish = auth.user.locale === "es";
  await createNotifications([
    {
      userId: assignment.teacher.userId,
      type: NotificationType.CLASS_REMINDER,
      title: isSpanish ? "Nueva solicitud de clase" : "New class request",
      body: isSpanish ? `${assignment.student.user.name} solicitó una clase individual.` : `${assignment.student.user.name} requested a one-time class.`,
      actionUrl: "/teacher/schedule",
    },
    ...admins.map((admin) => ({
      userId: admin.id,
      type: NotificationType.SYSTEM,
      title: isSpanish ? "Solicitud de clase pendiente" : "Pending class request",
      body: isSpanish ? `${assignment.student.user.name} solicitó una clase.` : `${assignment.student.user.name} requested a class.`,
      actionUrl: "/admin/schedule",
    })),
  ]);

  return NextResponse.json({ ok: true, requestId: classRequest.id });
}
