import "server-only";

import { RescheduleStatus, SessionStatus, VideoStatus } from "@prisma/client";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export async function getTeacherDashboardData(viewer: AppViewer) {
  if (viewer.role !== "TEACHER" || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const teacherProfileId = viewer.teacherProfileId;
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

export async function getTeacherVideosData(viewer: AppViewer, statusFilter: "all" | "pending" | "reviewed" = "all") {
  if (viewer.role !== "TEACHER" || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const whereStatus =
    statusFilter === "pending"
      ? { in: [VideoStatus.PENDING] as VideoStatus[] }
      : statusFilter === "reviewed"
        ? { in: [VideoStatus.REVIEWED, VideoStatus.FEEDBACK_GIVEN] as VideoStatus[] }
        : undefined;

  const [videos, assignedStudents] = await Promise.all([
    db.practiceVideo.findMany({
      where: { teacherId: viewer.teacherProfileId, ...(whereStatus ? { status: whereStatus } : {}) },
      include: {
        student: { include: { user: true } },
        feedback: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.teacherAssignment.findMany({
      where: { teacherId: viewer.teacherProfileId },
      include: { student: { include: { user: true } } },
    }),
  ]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const submittedThisWeek = new Set(
    videos
      .filter((video) => video.submittedAt >= weekStart && video.submittedAt <= weekEnd)
      .map((video) => video.studentId),
  );
  const missingThisWeek = assignedStudents.filter((assignment) => !submittedThisWeek.has(assignment.studentId));

  return {
    videos,
    missingThisWeek,
    statusFilter,
  };
}

export async function getTeacherRequestsData(viewer: AppViewer) {
  if (viewer.role !== "TEACHER" || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  return db.rescheduleRequest.findMany({
    where: {
      status: RescheduleStatus.PENDING,
      session: { teacherId: viewer.teacherProfileId },
    },
    include: {
      session: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
