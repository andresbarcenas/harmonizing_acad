import { SessionStatus } from "@prisma/client";
import { endOfMonth, startOfMonth } from "date-fns";

import { db } from "@/lib/db";

export async function getStudentDashboard(studentProfileId: string) {
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
