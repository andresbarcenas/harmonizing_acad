import { addDays, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { RescheduleStatus, SessionStatus } from "@prisma/client";

import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { db } from "@/lib/db";

export async function getStudentSchedule(studentProfileId: string) {
  const student = await db.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      assignment: {
        include: {
          teacher: {
            include: {
              user: true,
              availability: true,
            },
          },
        },
      },
    },
  });

  if (!student?.assignment) {
    return {
      assignedTeacher: null,
      sessions: [],
      slots: [],
      pendingRequests: [],
    };
  }

  const now = new Date();
  const nextWeek = addDays(now, 7);

  const [sessions, pendingRequests] = await Promise.all([
    db.classSession.findMany({
      where: {
        studentId: studentProfileId,
        startsAtUtc: { gte: now, lte: nextWeek },
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
      },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.rescheduleRequest.findMany({
      where: {
        session: { studentId: studentProfileId },
        status: RescheduleStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const slots = buildWeekSlots(
    student.assignment.teacher.availability,
    student.assignment.teacher.user.timezone ?? "America/New_York",
  );

  return {
    assignedTeacher: student.assignment.teacher,
    sessions,
    slots,
    pendingRequests,
  };
}

type Availability = {
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

function buildWeekSlots(availability: Availability[], defaultTz: string) {
  const now = new Date();
  const slots: { startUtc: Date; endUtc: Date }[] = [];
  const seen = new Set<string>();
  const normalizedDefaultTimezone = normalizeIanaTimezone(defaultTz);

  for (const window of availability) {
    const timezone = normalizeIanaTimezone(window.timezone || normalizedDefaultTimezone);
    const zoneStart = startOfDay(toZonedTime(now, timezone));

    for (let i = 0; i < 7; i += 1) {
      const localDate = addDays(zoneStart, i);
      if (localDate.getDay() !== window.weekday) continue;

      for (let minute = window.startMinuteLocal; minute + 60 <= window.endMinuteLocal; minute += 60) {
        const localSlot = new Date(localDate);
        localSlot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
        const startUtc = fromZonedTime(localSlot, timezone);
        const dedupeKey = startUtc.toISOString();
        if (startUtc <= now || seen.has(dedupeKey)) continue;

        const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
        slots.push({ startUtc, endUtc });
        seen.add(dedupeKey);
      }
    }
  }

  return slots.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime()).slice(0, 12);
}
