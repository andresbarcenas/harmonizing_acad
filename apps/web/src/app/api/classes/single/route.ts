import { NextResponse } from "next/server";
import { NotificationType, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeInstrument } from "@/lib/instruments";
import { createNotifications } from "@/lib/notifications";
import { buildUtcClassWindow, validateClassBookingWindow } from "@/lib/scheduling";
import { singleClassBookingSchema } from "@/lib/validators/class-scheduling";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para crear clases." : "You do not have permission to create classes." }, { status: 403 });
  }

  const parsed = singleClassBookingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const teacherId = auth.user.role === Role.TEACHER ? auth.user.teacherProfile?.id : payload.teacherId;
  if (!teacherId) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Selecciona una docente." : "Select a teacher." }, { status: 400 });
  }

  if (auth.user.role === Role.TEACHER) {
    const assignment = await db.teacherAssignment.findFirst({
      where: { teacherId, studentId: payload.studentId },
      select: { id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Solo puedes reservar clases para estudiantes asignados a ti." : "You can only book classes for your assigned students." }, { status: 403 });
    }
  }

  const [student, teacher] = await Promise.all([
    db.studentProfile.findUnique({ where: { id: payload.studentId }, include: { user: true } }),
    db.teacherProfile.findUnique({ where: { id: teacherId }, include: { user: true } }),
  ]);

  if (!student || !teacher) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Estudiante o docente no encontrada." : "Student or teacher not found." }, { status: 404 });
  }

  const window = buildUtcClassWindow({
    date: payload.date,
    startTimeLocal: payload.startTimeLocal,
    timezone: payload.timezone,
    durationMin: payload.durationMin,
  });

  const validation = await validateClassBookingWindow({
    teacherId,
    studentId: payload.studentId,
    startsAtUtc: window.startsAtUtc,
    endsAtUtc: window.endsAtUtc,
    durationMin: payload.durationMin,
    timezone: window.timezone,
    locale: auth.user.locale,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message, code: validation.code }, { status: validation.status });
  }

  const meetingUrl = payload.meetingUrl ?? "https://meet.google.com/harmonizing-class";
  const session = await db.classSession.create({
    data: {
      studentId: payload.studentId,
      teacherId,
      type: payload.type,
      startsAtUtc: window.startsAtUtc,
      endsAtUtc: window.endsAtUtc,
      timezone: window.timezone,
      instrument: payload.instrument ?? normalizeInstrument(student.preferredInstrument) ?? "Piano",
      locationMode: payload.locationMode,
      meetingUrl,
      status: SessionStatus.SCHEDULED,
      lessonFocus: payload.lessonFocus,
      internalNote: payload.internalNote,
      studentVisibleNote: payload.studentVisibleNote,
    },
  });

  const isSpanish = auth.user.locale === "es";
  await createNotifications([
    {
      userId: student.userId,
      type: NotificationType.CLASS_REMINDER,
      title: isSpanish ? "Nueva clase agendada" : "New class booked",
      body: isSpanish ? "Tu academia agendó una clase individual." : "Your academy booked a one-time class.",
      actionUrl: `/classes/${session.id}`,
    },
    ...(teacher.userId !== auth.user.id
      ? [{
          userId: teacher.userId,
          type: NotificationType.CLASS_REMINDER,
          title: isSpanish ? "Nueva clase en tu agenda" : "New class on your schedule",
          body: isSpanish ? `Se agendó una clase con ${student.user.name}.` : `A class with ${student.user.name} was booked.`,
          actionUrl: `/classes/${session.id}`,
        }]
      : []),
  ]);

  return NextResponse.json({ ok: true, sessionId: session.id });
}
