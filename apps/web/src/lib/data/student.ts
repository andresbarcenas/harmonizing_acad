import "server-only";

import { ClassRequestStatus, RescheduleStatus, SessionStatus } from "@prisma/client";
import { addDays, endOfMonth, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { overlapsRange } from "@/lib/scheduling";

export async function getStudentDashboardData(viewer: AppViewer) {
  if (viewer.role !== "STUDENT" || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  const studentProfileId = viewer.studentProfileId;
  const now = new Date();

  const [student, upcomingClass, latestCompleted, activeSubscription, progress, songs, goals] = await Promise.all([
    db.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: true,
        assignment: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
      },
    }),
    db.classSession.findFirst({
      where: {
        studentId: studentProfileId,
        startsAtUtc: { gte: now },
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
      },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.classSession.findFirst({
      where: {
        studentId: studentProfileId,
        status: SessionStatus.COMPLETED,
      },
      include: { lessonNote: true },
      orderBy: { startsAtUtc: "desc" },
    }),
    db.activeSubscription.findFirst({
      where: { studentId: studentProfileId, active: true },
      include: { plan: true },
    }),
    db.progressRecord.findFirst({
      where: { studentId: studentProfileId },
      orderBy: { updatedAt: "desc" },
    }),
    db.learnedSong.findMany({
      where: { studentId: studentProfileId },
      orderBy: { learnedAt: "desc" },
      take: 4,
    }),
    db.goal.findMany({
      where: { studentId: studentProfileId },
      orderBy: { targetDate: "asc" },
      take: 3,
    }),
  ]);

  const usedClasses = await db.classSession.count({
    where: {
      studentId: studentProfileId,
      status: SessionStatus.COMPLETED,
      startsAtUtc: {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      },
    },
  });

  const monthlyLimit = activeSubscription?.monthlyClassLimit ?? 4;

  return {
    student,
    upcomingClass,
    latestCompleted,
    activeSubscription,
    progress,
    songs,
    goals,
    usedClasses,
    remainingClasses: Math.max(monthlyLimit - usedClasses, 0),
  };
}

export async function getStudentScheduleData(viewer: AppViewer, options: { week?: string } = {}) {
  if (viewer.role !== "STUDENT" || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  const studentProfileId = viewer.studentProfileId;
  const now = new Date();
  const studentTimezone = normalizeIanaTimezone(viewer.timezone);
  const week = resolveScheduleWeek(studentTimezone, options.week);

  const [student, sessions, nextUpcomingSession, pendingRequests, classRequests] = await Promise.all([
    db.studentProfile.findUnique({
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
    }),
    db.classSession.findMany({
      where: {
        studentId: studentProfileId,
        startsAtUtc: {
          gte: week.startUtc,
          lt: week.endUtc,
        },
        status: { not: SessionStatus.CANCELLED },
      },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.classSession.findFirst({
      where: {
        studentId: studentProfileId,
        startsAtUtc: { gte: now },
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
    db.classRequest.findMany({
      where: {
        studentId: studentProfileId,
        status: ClassRequestStatus.PENDING,
      },
      include: {
        teacher: { include: { user: true } },
        createdSession: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const teacher = student?.assignment?.teacher;
  let slots = teacher
    ? buildWeekSlots(teacher.availability, teacher.user.timezone ?? "America/New_York", week.startUtc, week.endUtc)
    : [];

  if (teacher && slots.length) {
    const busySessions = await db.classSession.findMany({
      where: {
        teacherId: teacher.id,
        status: { not: SessionStatus.CANCELLED },
        startsAtUtc: { lt: week.endUtc },
        endsAtUtc: { gt: week.startUtc },
      },
      select: {
        startsAtUtc: true,
        endsAtUtc: true,
      },
    });

    slots = slots.filter((slot) =>
      !busySessions.some((session) => overlapsRange(slot.startUtc, slot.endUtc, session.startsAtUtc, session.endsAtUtc)),
    );
  }

  return {
    assignedTeacher: teacher ?? null,
    sessions,
    nextUpcomingSession,
    slots,
    pendingRequests,
    classRequests,
    week,
  };
}

export async function getStudentVideosData(viewer: AppViewer) {
  if (viewer.role !== "STUDENT" || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  const [videos, assignments, repertoireItems, skillCategories] = await Promise.all([
    db.practiceVideo.findMany({
      where: { studentId: viewer.studentProfileId },
      include: { feedback: true, practiceAssignment: true, repertoireItem: true, skillCategory: true },
      orderBy: { submittedAt: "desc" },
    }),
    db.practiceAssignment.findMany({
      where: { studentId: viewer.studentProfileId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    db.repertoireItem.findMany({
      where: { studentId: viewer.studentProfileId },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    db.skillCategory.findMany({ where: { active: true }, orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }] }),
  ]);

  return { videos, assignments, repertoireItems, skillCategories };
}

type Availability = {
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

function buildWeekSlots(availability: Availability[], fallbackTimezone: string, selectedWeekStartUtc: Date, selectedWeekEndUtc: Date) {
  const now = new Date();
  const slots: { startUtc: Date; endUtc: Date }[] = [];
  const seen = new Set<string>();
  const normalizedDefaultTimezone = normalizeIanaTimezone(fallbackTimezone);

  for (const window of availability) {
    const timezone = normalizeIanaTimezone(window.timezone || normalizedDefaultTimezone);
    // Generate around the selected student week, then filter by UTC bounds so teacher/student timezones stay aligned.
    const zoneStart = startOfDay(toZonedTime(addDays(selectedWeekStartUtc, -1), timezone));

    for (let i = 0; i < 9; i += 1) {
      const localDate = addDays(zoneStart, i);
      if (localDate.getDay() !== window.weekday) continue;

      for (let minute = window.startMinuteLocal; minute + 60 <= window.endMinuteLocal; minute += 60) {
        const localSlot = new Date(localDate);
        localSlot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
        const startUtc = fromZonedTime(localSlot, timezone);
        const dedupeKey = startUtc.toISOString();
        if (startUtc <= now || startUtc < selectedWeekStartUtc || startUtc >= selectedWeekEndUtc || seen.has(dedupeKey)) continue;

        const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
        slots.push({ startUtc, endUtc });
        seen.add(dedupeKey);
      }
    }
  }

  return slots.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
}

function resolveScheduleWeek(timezone: string, weekParam?: string) {
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  const anchor = parseWeekParamAsLocalAnchor(weekParam, normalizedTimezone) ?? new Date();
  const zonedAnchor = toZonedTime(anchor, normalizedTimezone);
  const localWeekStart = startOfWeek(zonedAnchor, { weekStartsOn: 1 });
  localWeekStart.setHours(0, 0, 0, 0);

  const localWeekEnd = addDays(localWeekStart, 7);
  const startUtc = fromZonedTime(localWeekStart, normalizedTimezone);
  const endUtc = fromZonedTime(localWeekEnd, normalizedTimezone);

  return {
    startUtc,
    endUtc,
    startKey: format(localWeekStart, "yyyy-MM-dd"),
    previousWeekKey: format(addDays(localWeekStart, -7), "yyyy-MM-dd"),
    nextWeekKey: format(addDays(localWeekStart, 7), "yyyy-MM-dd"),
    currentWeekKey: format(startOfWeek(toZonedTime(new Date(), normalizedTimezone), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

function parseWeekParamAsLocalAnchor(weekParam: string | undefined, timezone: string) {
  if (!weekParam || !/^\d{4}-\d{2}-\d{2}$/.test(weekParam)) return null;

  const [year, month, day] = weekParam.split("-").map(Number);
  if (!year || !month || !day) return null;

  const localNoon = new Date(year, month - 1, day, 12, 0, 0, 0);
  return fromZonedTime(localNoon, normalizeIanaTimezone(timezone));
}
