import { addDays, startOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { RescheduleStatus, SessionStatus } from "@prisma/client";

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
  const today = startOfDay(new Date());
  const slots: { startUtc: Date; endUtc: Date }[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(today, i);
    const day = date.getDay();

    const matching = availability.filter((entry) => entry.weekday === day);

    for (const window of matching) {
      const timezone = window.timezone || defaultTz;
      for (let minute = window.startMinuteLocal; minute + 60 <= window.endMinuteLocal; minute += 60) {
        const localSlot = new Date(date);
        localSlot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
        const startUtc = fromZonedTime(localSlot, timezone);
        const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
        if (startUtc > new Date()) {
          slots.push({ startUtc, endUtc });
        }
      }
    }
  }

  return slots.slice(0, 12);
}
