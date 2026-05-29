import { NextResponse } from "next/server";
import { NotificationType, RescheduleStatus, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { formatDateTimeInZone } from "@/lib/i18n";
import { createNotifications } from "@/lib/notifications";
import { buildUtcClassWindow, validateClassBookingWindow } from "@/lib/scheduling";
import { teacherDirectRescheduleSchema } from "@/lib/validators/class-scheduling";

export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const parsed = teacherDirectRescheduleSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? "Revisa fecha, hora y duración." : "Check the date, time, and duration." },
      { status: 400 },
    );
  }

  const { classId } = await params;
  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: auth.user.teacherProfile.id,
      status: SessionStatus.RESCHEDULE_PENDING,
    },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      rescheduleRequests: {
        where: { status: RescheduleStatus.PENDING },
        select: { id: true, requestedById: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? "Clase pendiente no encontrada." : "Pending class not found." },
      { status: 404 },
    );
  }

  const input = parsed.data;
  const teacherTimezone = normalizeIanaTimezone(session.teacher.user.timezone);
  const studentTimezone = normalizeIanaTimezone(session.student.user.timezone);
  const bookingTimezone = input.timezoneMode === "STUDENT_TIME" ? studentTimezone : teacherTimezone;
  const window = buildUtcClassWindow({
    date: input.date,
    startTimeLocal: input.startTimeLocal,
    timezone: bookingTimezone,
    durationMin: input.durationMin,
  });

  const validation = await validateClassBookingWindow({
    teacherId: session.teacherId,
    studentId: session.studentId,
    startsAtUtc: window.startsAtUtc,
    endsAtUtc: window.endsAtUtc,
    durationMin: input.durationMin,
    timezone: window.timezone,
    locale: auth.user.locale,
    ignoreSessionId: session.id,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message, code: validation.code }, { status: validation.status });
  }

  const teacherTimeLabel = formatDateTimeInZone(window.startsAtUtc, teacherTimezone, auth.user.locale);
  const studentTimeLabel = formatDateTimeInZone(window.startsAtUtc, studentTimezone, auth.user.locale);
  const confirmedTimeNote = auth.user.locale === "es"
    ? `Horario confirmado: ${teacherTimeLabel} (${teacherTimezone}) / ${studentTimeLabel} (${studentTimezone}).`
    : `Confirmed time: ${teacherTimeLabel} (${teacherTimezone}) / ${studentTimeLabel} (${studentTimezone}).`;
  const responseText = input.teacherResponse ? `${input.teacherResponse}\n\n${confirmedTimeNote}` : confirmedTimeNote;
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.classSession.update({
      where: { id: session.id },
      data: {
        startsAtUtc: window.startsAtUtc,
        endsAtUtc: window.endsAtUtc,
        timezone: window.timezone,
        status: SessionStatus.SCHEDULED,
      },
    });

    if (session.rescheduleRequests.length) {
      await tx.rescheduleRequest.updateMany({
        where: {
          sessionId: session.id,
          status: RescheduleStatus.PENDING,
        },
        data: {
          status: RescheduleStatus.ACCEPTED,
          teacherResponse: responseText,
          reviewedById: auth.user.teacherProfile!.id,
          decidedAt: now,
        },
      });
    }
  });

  const requesterUserIds = session.rescheduleRequests
    .map((request) => request.requestedById)
    .filter((userId) => userId !== session.student.userId);
  const notifiedUserIds = Array.from(new Set([session.student.userId, ...requesterUserIds]));

  await createNotifications(notifiedUserIds.map((userId) => ({
    userId,
    type: NotificationType.RESCHEDULE_UPDATE,
    title: auth.user.locale === "es" ? "Clase reagendada" : "Class rescheduled",
    body: auth.user.locale === "es" ? "Tu docente confirmó el nuevo horario de clase." : "Your teacher confirmed the new class time.",
    actionUrl: `/classes/${session.id}`,
  })));

  return NextResponse.json({ ok: true, sessionId: session.id });
}
