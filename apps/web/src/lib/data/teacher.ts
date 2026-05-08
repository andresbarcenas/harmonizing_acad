import "server-only";

import { RescheduleStatus, SessionStatus, VideoStatus } from "@prisma/client";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

async function resolveTeacherStudentContext(teacherProfileId: string, studentId?: string | null) {
  if (!studentId) return null;

  const assignment = await db.teacherAssignment.findFirst({
    where: { teacherId: teacherProfileId, studentId },
    select: { studentId: true },
  });

  return assignment?.studentId ?? null;
}

export async function getTeacherDashboardData(viewer: AppViewer, options: { studentId?: string | null } = {}) {
  if (viewer.role !== "TEACHER" || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const teacherProfileId = viewer.teacherProfileId;
  const selectedStudentId = await resolveTeacherStudentContext(teacherProfileId, options.studentId);
  const studentFilter = selectedStudentId ? { studentId: selectedStudentId } : {};
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
        ...studentFilter,
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
      where: { teacherId: teacherProfileId, ...studentFilter },
      include: {
        student: {
          include: { user: true },
        },
      },
    }),
    db.rescheduleRequest.findMany({
      where: {
        status: RescheduleStatus.PENDING,
        session: { teacherId: teacherProfileId, ...studentFilter },
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
        ...studentFilter,
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
        ...studentFilter,
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
    selectedStudentId,
  };
}

export async function getTeacherVideosData(
  viewer: AppViewer,
  statusFilter: "all" | "pending" | "reviewed" = "all",
  options: { studentId?: string | null } = {},
) {
  if (viewer.role !== "TEACHER" || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }
  const selectedStudentId = await resolveTeacherStudentContext(viewer.teacherProfileId, options.studentId);
  const studentFilter = selectedStudentId ? { studentId: selectedStudentId } : {};

  const whereStatus =
    statusFilter === "pending"
      ? { in: [VideoStatus.PENDING] as VideoStatus[] }
      : statusFilter === "reviewed"
        ? { in: [VideoStatus.REVIEWED, VideoStatus.FEEDBACK_GIVEN] as VideoStatus[] }
        : undefined;

  const [videos, assignedStudents, skillCategories] = await Promise.all([
    db.practiceVideo.findMany({
      where: { teacherId: viewer.teacherProfileId, ...studentFilter, ...(whereStatus ? { status: whereStatus } : {}) },
      include: {
        student: { include: { user: true } },
        feedback: { include: { skillRatings: { include: { skillCategory: true } } } },
        repertoireItem: true,
        skillCategory: true,
        practiceAssignment: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.teacherAssignment.findMany({
      where: { teacherId: viewer.teacherProfileId, ...studentFilter },
      include: { student: { include: { user: true } } },
    }),
    db.skillCategory.findMany({ where: { active: true }, orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }] }),
  ]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklySubmissions = await db.practiceVideo.findMany({
    where: {
      teacherId: viewer.teacherProfileId,
      ...studentFilter,
      submittedAt: { gte: weekStart, lte: weekEnd },
    },
    select: { studentId: true },
  });
  const submittedThisWeek = new Set(
    weeklySubmissions.map((video) => video.studentId),
  );
  const missingThisWeek = assignedStudents.filter((assignment) => !submittedThisWeek.has(assignment.studentId));

  return {
    videos,
    missingThisWeek,
    statusFilter,
    selectedStudentId,
    skillCategories,
  };
}

export async function getTeacherRequestsData(viewer: AppViewer, options: { studentId?: string | null } = {}) {
  if (viewer.role !== "TEACHER" || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }
  const selectedStudentId = await resolveTeacherStudentContext(viewer.teacherProfileId, options.studentId);
  const studentFilter = selectedStudentId ? { studentId: selectedStudentId } : {};

  const requests = await db.rescheduleRequest.findMany({
    where: {
      status: RescheduleStatus.PENDING,
      session: { teacherId: viewer.teacherProfileId, ...studentFilter },
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

  return { requests, selectedStudentId };
}
