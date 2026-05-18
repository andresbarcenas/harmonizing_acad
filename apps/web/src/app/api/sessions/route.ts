import { NextResponse } from "next/server";
import { ClassSessionType, NotificationType, RecurringTimezoneMode, Role, SessionStatus } from "@prisma/client";
import { addDays, addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { randomUUID } from "crypto";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeInstrument } from "@/lib/instruments";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { createNotification } from "@/lib/notifications";
import { isSlotWithinAvailability, isTeacherBlackoutDate } from "@/lib/scheduling";
import { createRecurringSessionsSchema } from "@/lib/validators/sessions";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId, status, notes } = (await req.json()) as {
    sessionId: string;
    status: "COMPLETED" | "NO_SHOW";
    notes?: string;
  };

  if (!sessionId || ![SessionStatus.COMPLETED, SessionStatus.NO_SHOW].includes(status)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Payload inválido" : "Invalid payload." }, { status: 400 });
  }

  const session = await db.classSession.findFirst({
    where: {
      id: sessionId,
      teacherId: auth.user.teacherProfile.id,
    },
  });

  if (!session) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Clase no encontrada" : "Class not found." }, { status: 404 });
  }

  await db.classSession.update({
    where: { id: session.id },
    data: {
      status,
      completedAt: status === SessionStatus.COMPLETED ? new Date() : null,
      lastClassNotes: notes,
    },
  });

  const student = await db.studentProfile.findUnique({
    where: { id: session.studentId },
    select: { userId: true },
  });

  if (student) {
    await createNotification({
      userId: student.userId,
      type: NotificationType.CLASS_REMINDER,
      title: status === SessionStatus.COMPLETED ? "Class completed" : "Class marked as no-show",
      body: status === SessionStatus.COMPLETED ? "Your teacher added progress notes." : "Contact your teacher to reschedule.",
      actionUrl: "/dashboard",
    });
  }

  return NextResponse.json({ ok: true });
}

function parseDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (
    (auth.user.role !== Role.TEACHER && auth.user.role !== Role.ADMIN) ||
    (auth.user.role === Role.TEACHER && !auth.user.teacherProfile)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createRecurringSessionsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const teacherProfileId = auth.user.role === Role.TEACHER ? auth.user.teacherProfile?.id : data.teacherId;
  if (!teacherProfileId) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Selecciona una docente." : "Select a teacher." }, { status: 400 });
  }

  const assignment = auth.user.role === Role.TEACHER
    ? await db.teacherAssignment.findFirst({
        where: {
          teacherId: teacherProfileId,
          studentId: data.studentId,
        },
        include: {
          teacher: {
            include: { user: { select: { timezone: true } }, availability: true, blackoutDates: true },
          },
          student: {
            include: { user: true },
          },
        },
      })
    : null;

  const [adminTeacher, adminStudent] = auth.user.role === Role.ADMIN
    ? await Promise.all([
        db.teacherProfile.findUnique({ where: { id: teacherProfileId }, include: { user: { select: { timezone: true } }, availability: true, blackoutDates: true } }).catch(() => null),
        db.studentProfile.findUnique({ where: { id: data.studentId }, include: { user: true } }),
      ])
    : [null, null];

  if (auth.user.role === Role.TEACHER && !assignment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El estudiante no está asignado a esta docente." : "The student is not assigned to this teacher." }, { status: 400 });
  }
  if (auth.user.role === Role.ADMIN && (!adminTeacher || !adminStudent)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Estudiante o docente no encontrada." : "Student or teacher not found." }, { status: 404 });
  }

  const teacherTimezone = normalizeIanaTimezone(assignment?.teacher.user.timezone ?? adminTeacher?.user.timezone ?? "America/New_York");
  const student = assignment?.student ?? adminStudent!;
  const studentTimezone = normalizeIanaTimezone(student.user.timezone);
  const timezoneMode = data.timezoneMode ?? RecurringTimezoneMode.STUDENT_TIME;
  if (auth.user.role !== Role.ADMIN && timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solo administración puede usar una zona horaria personalizada." : "Only admins can use a custom timezone." }, { status: 403 });
  }
  if (timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE && !data.timezone) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Selecciona una zona horaria personalizada." : "Select a custom timezone." }, { status: 400 });
  }

  const recurrenceTimezone =
    timezoneMode === RecurringTimezoneMode.TEACHER_TIME
      ? teacherTimezone
      : timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE
        ? normalizeIanaTimezone(data.timezone)
        : studentTimezone;
  const teacherAvailability = assignment?.teacher.availability ?? adminTeacher?.availability ?? [];
  const teacherBlackoutDates = assignment?.teacher.blackoutDates ?? adminTeacher?.blackoutDates ?? [];

  const { year, month, day } = parseDateParts(data.startsOnDate);
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(baseDate.getTime())) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Fecha de inicio inválida." : "Invalid start date." }, { status: 400 });
  }
  const now = new Date();

  const weekdays = Array.from(new Set(data.weekdays)).sort((a, b) => a - b);
  const startMinuteLocal = toMinutes(data.startTimeLocal);
  const weekAnchor = addDays(baseDate, -baseDate.getUTCDay());

  const sessionsToCreate: Array<{
    recurrenceId: string;
    studentId: string;
    teacherId: string;
    startsAtUtc: Date;
    endsAtUtc: Date;
    meetingUrl: string;
    lessonFocus?: string;
    type: ClassSessionType;
    timezone: string;
    instrument?: string | null;
    status: SessionStatus;
  }> = [];

  const conflictWindows: string[] = [];
  const recurrenceId = randomUUID();

  for (let weekIndex = 0; weekIndex < data.horizonWeeks; weekIndex += 1) {
    if (weekIndex % data.intervalWeeks !== 0) continue;
    const thisWeekStart = addDays(weekAnchor, weekIndex * 7);

    for (const weekday of weekdays) {
      const localDate = addDays(thisWeekStart, weekday);
      if (localDate < baseDate) continue;

      const localDateTime = `${localDate.getUTCFullYear()}-${pad2(localDate.getUTCMonth() + 1)}-${pad2(localDate.getUTCDate())}T${data.startTimeLocal}:00`;
      const startsAtUtc = fromZonedTime(localDateTime, recurrenceTimezone);
      const endsAtUtc = addMinutes(startsAtUtc, data.durationMin);
      if (endsAtUtc <= now) continue;

      if (isTeacherBlackoutDate(startsAtUtc, teacherTimezone, teacherBlackoutDates)) {
        conflictWindows.push(
          auth.user.locale === "es"
            ? `${localDateTime} día no disponible para la docente`
            : `${localDateTime} teacher blackout date`,
        );
        continue;
      }

      if (
        teacherAvailability.length &&
        !isSlotWithinAvailability(startsAtUtc, endsAtUtc, teacherAvailability, teacherTimezone)
      ) {
        conflictWindows.push(
          auth.user.locale === "es"
            ? `${localDateTime} fuera de disponibilidad docente`
            : `${localDateTime} outside teacher availability`,
        );
        continue;
      }

      const [teacherConflict, studentConflict] = await Promise.all([
        db.classSession.findFirst({
          where: {
            teacherId: teacherProfileId,
            status: { not: SessionStatus.CANCELLED },
            startsAtUtc: { lt: endsAtUtc },
            endsAtUtc: { gt: startsAtUtc },
          },
          select: { id: true },
        }),
        db.classSession.findFirst({
          where: {
            studentId: data.studentId,
            status: { not: SessionStatus.CANCELLED },
            startsAtUtc: { lt: endsAtUtc },
            endsAtUtc: { gt: startsAtUtc },
          },
          select: { id: true },
        }),
      ]);

      if (teacherConflict || studentConflict) {
        conflictWindows.push(localDateTime);
        continue;
      }

      sessionsToCreate.push({
        recurrenceId,
        studentId: data.studentId,
        teacherId: teacherProfileId,
        startsAtUtc,
        endsAtUtc,
        meetingUrl: data.meetingUrl,
        lessonFocus: data.lessonFocus,
        type: ClassSessionType.RECURRING,
        timezone: recurrenceTimezone,
        instrument: normalizeInstrument(student.preferredInstrument) ?? "Piano",
        status: SessionStatus.SCHEDULED,
      });
    }
  }

  if (!sessionsToCreate.length) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? "No se pudieron crear clases por conflictos de horario." : "Could not create classes because of schedule conflicts.", conflicts: conflictWindows },
      { status: 400 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.recurringClassSeries.create({
      data: {
        id: recurrenceId,
        studentId: data.studentId,
        teacherId: teacherProfileId,
        timezone: recurrenceTimezone,
        startsOnDate: baseDate,
        startTimeLocal: data.startTimeLocal,
        startMinuteLocal,
        durationMin: data.durationMin,
        intervalWeeks: data.intervalWeeks,
        horizonWeeks: data.horizonWeeks,
        timezoneMode,
        weekdays,
        meetingUrl: data.meetingUrl,
        lessonFocus: data.lessonFocus,
        active: true,
      },
    });

    await tx.classSession.createMany({
      data: sessionsToCreate,
    });
  });

  await createNotification({
    userId: student.userId,
    type: NotificationType.CLASS_REMINDER,
    title: "New recurring classes",
    body: `Your teacher scheduled ${sessionsToCreate.length} class(es) in a new series.`,
    actionUrl: "/schedule",
  });

  return NextResponse.json({
    ok: true,
    seriesId: recurrenceId,
    created: sessionsToCreate.length,
    conflicts: conflictWindows,
  });
}
