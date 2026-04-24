import "server-only";

import { RescheduleStatus, SessionStatus } from "@prisma/client";
import { addDays, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

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

export async function getStudentScheduleData(viewer: AppViewer) {
  if (viewer.role !== "STUDENT" || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  const studentProfileId = viewer.studentProfileId;
  const now = new Date();

  const [student, sessions, pendingRequests] = await Promise.all([
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
        startsAtUtc: { gte: now },
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
      },
      orderBy: { startsAtUtc: "asc" },
      take: 8,
    }),
    db.rescheduleRequest.findMany({
      where: {
        session: { studentId: studentProfileId },
        status: RescheduleStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const teacher = student?.assignment?.teacher;
  const slots = teacher ? buildWeekSlots(teacher.availability, teacher.user.timezone ?? "America/New_York") : [];

  return {
    assignedTeacher: teacher ?? null,
    sessions,
    slots,
    pendingRequests,
  };
}

export async function getStudentVideosData(viewer: AppViewer) {
  if (viewer.role !== "STUDENT" || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  return db.practiceVideo.findMany({
    where: { studentId: viewer.studentProfileId },
    include: { feedback: true },
    orderBy: { submittedAt: "desc" },
  });
}

type Availability = {
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

function buildWeekSlots(availability: Availability[], fallbackTimezone: string) {
  const now = new Date();
  const slots: { startUtc: Date; endUtc: Date }[] = [];
  const seen = new Set<string>();
  const normalizedDefaultTimezone = normalizeIanaTimezone(fallbackTimezone);

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
