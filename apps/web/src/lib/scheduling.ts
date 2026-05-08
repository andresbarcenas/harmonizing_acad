import { addMinutes } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { SessionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

type AvailabilityWindow = {
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function isValidRescheduleDuration(start: Date, end: Date) {
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return durationMinutes >= 30 && durationMinutes <= 180;
}

export function isSlotWithinAvailability(
  startUtc: Date,
  endUtc: Date,
  availability: AvailabilityWindow[],
  fallbackTimezone: string,
) {
  return availability.some((window) => {
    const timezone = normalizeIanaTimezone(window.timezone || fallbackTimezone);
    const localStart = toZonedTime(startUtc, timezone);
    const localEnd = toZonedTime(endUtc, timezone);

    if (localStart.getDay() !== window.weekday || localEnd.getDay() !== window.weekday) {
      return false;
    }

    const startMinute = minuteOfDay(localStart);
    const endMinute = minuteOfDay(localEnd);
    return startMinute >= window.startMinuteLocal && endMinute <= window.endMinuteLocal;
  });
}

export function overlapsRange(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function buildUtcClassWindow(input: {
  date: string;
  startTimeLocal: string;
  timezone: string;
  durationMin: number;
}) {
  const timezone = normalizeIanaTimezone(input.timezone);
  const localDateTime = `${input.date}T${input.startTimeLocal}:00`;
  const startsAtUtc = fromZonedTime(localDateTime, timezone);
  const endsAtUtc = addMinutes(startsAtUtc, input.durationMin);

  return {
    startsAtUtc,
    endsAtUtc,
    timezone,
  };
}

type ScheduleValidationResult =
  | { ok: true }
  | {
      ok: false;
      status: 400 | 409;
      code: "INVALID_TIME" | "INVALID_DURATION" | "TEACHER_CONFLICT" | "STUDENT_CONFLICT" | "OUTSIDE_AVAILABILITY";
      message: string;
    };

export async function validateClassBookingWindow(input: {
  teacherId: string;
  studentId: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  durationMin: number;
  timezone: string;
  locale?: string;
  ignoreSessionId?: string;
}): Promise<ScheduleValidationResult> {
  const isSpanish = input.locale === "es";

  if (
    Number.isNaN(input.startsAtUtc.getTime()) ||
    Number.isNaN(input.endsAtUtc.getTime()) ||
    input.startsAtUtc >= input.endsAtUtc
  ) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_TIME",
      message: isSpanish ? "Fecha u hora inválida." : "Invalid date or time.",
    };
  }

  if (input.startsAtUtc <= new Date()) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_TIME",
      message: isSpanish ? "La clase debe agendarse en una fecha futura." : "The class must be booked for a future time.",
    };
  }

  if (input.durationMin < 15 || input.durationMin > 180) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_DURATION",
      message: isSpanish ? "La duración debe estar entre 15 y 180 minutos." : "Duration must be between 15 and 180 minutes.",
    };
  }

  const overlapWhere = {
    status: { not: SessionStatus.CANCELLED },
    startsAtUtc: { lt: input.endsAtUtc },
    endsAtUtc: { gt: input.startsAtUtc },
    ...(input.ignoreSessionId ? { id: { not: input.ignoreSessionId } } : {}),
  };

  const [teacherConflict, studentConflict, teacher] = await Promise.all([
    db.classSession.findFirst({
      where: {
        ...overlapWhere,
        teacherId: input.teacherId,
      },
      select: { id: true },
    }),
    db.classSession.findFirst({
      where: {
        ...overlapWhere,
        studentId: input.studentId,
      },
      select: { id: true },
    }),
    db.teacherProfile.findUnique({
      where: { id: input.teacherId },
      include: { user: true, availability: true },
    }),
  ]);

  if (teacherConflict) {
    return {
      ok: false,
      status: 409,
      code: "TEACHER_CONFLICT",
      message: isSpanish ? "La docente ya tiene otra clase en ese horario." : "The teacher already has another class at that time.",
    };
  }

  if (studentConflict) {
    return {
      ok: false,
      status: 409,
      code: "STUDENT_CONFLICT",
      message: isSpanish ? "El estudiante ya tiene otra clase en ese horario." : "The student already has another class at that time.",
    };
  }

  if (teacher?.availability.length) {
    const fallbackTimezone = normalizeIanaTimezone(teacher.user.timezone || input.timezone);
    if (!isSlotWithinAvailability(input.startsAtUtc, input.endsAtUtc, teacher.availability, fallbackTimezone)) {
      return {
        ok: false,
        status: 409,
        code: "OUTSIDE_AVAILABILITY",
        message: isSpanish ? "El horario está fuera de la disponibilidad docente." : "The time is outside the teacher availability.",
      };
    }
  }

  return { ok: true };
}
