import { endOfDay, startOfDay } from "date-fns";
import { RescheduleStatus, SessionStatus, VideoStatus } from "@prisma/client";

import { db } from "@/lib/db";

export async function getTeacherDashboard(teacherProfileId: string) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const now = new Date();

  const [teacher, classesToday, students, pendingRequests, pendingVideos, recurringSeries] = await Promise.all([
    db.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      include: {
        user: true,
      },
    }),
    db.classSession.findMany({
      where: {
        teacherId: teacherProfileId,
        startsAtUtc: { gte: todayStart, lte: todayEnd },
      },
      include: {
        student: {
          include: { user: true },
        },
      },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.teacherAssignment.findMany({
      where: { teacherId: teacherProfileId },
      include: {
        student: {
          include: { user: true },
        },
      },
    }),
    db.rescheduleRequest.findMany({
      where: {
        status: RescheduleStatus.PENDING,
        session: { teacherId: teacherProfileId },
      },
      include: {
        session: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.practiceVideo.findMany({
      where: {
        teacherId: teacherProfileId,
        status: { in: [VideoStatus.PENDING, VideoStatus.REVIEWED] },
      },
      include: {
        student: { include: { user: true } },
        feedback: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.recurringClassSeries.findMany({
      where: {
        teacherId: teacherProfileId,
      },
      include: {
        student: { include: { user: true } },
        sessions: {
          where: {
            startsAtUtc: { gte: now },
            status: { not: SessionStatus.CANCELLED },
          },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const classStatusCounts = {
    completed: classesToday.filter((item) => item.status === SessionStatus.COMPLETED).length,
    noShow: classesToday.filter((item) => item.status === SessionStatus.NO_SHOW).length,
    pending: classesToday.filter((item) => item.status === SessionStatus.RESCHEDULE_PENDING).length,
  };

  return {
    teacher,
    classesToday,
    students,
    pendingRequests,
    pendingVideos,
    classStatusCounts,
    recurringSeries,
  };
}
