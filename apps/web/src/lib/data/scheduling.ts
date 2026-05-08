import "server-only";

import { ClassRequestStatus, Role, SessionStatus } from "@prisma/client";
import { addDays, subDays } from "date-fns";

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

export async function getAdminScheduleData(viewer: AppViewer) {
  if (viewer.role !== Role.ADMIN) {
    throw new Error("Unauthorized: admin role required");
  }

  const now = new Date();
  const [students, teachers, sessions, classRequests] = await Promise.all([
    db.studentProfile.findMany({
      include: {
        user: true,
        assignment: { include: { teacher: { include: { user: true } } } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    db.teacherProfile.findMany({
      include: { user: true, availability: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.classSession.findMany({
      where: {
        startsAtUtc: { gte: subDays(now, 14), lte: addDays(now, 60) },
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        recurrence: true,
        classRequest: true,
        lessonNote: { select: { id: true } },
      },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.classRequest.findMany({
      where: {
        OR: [
          { status: ClassRequestStatus.PENDING },
          { createdAt: { gte: subDays(now, 30) } },
        ],
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        requestedBy: true,
        reviewedBy: true,
        createdSession: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);

  return { students, teachers, sessions, classRequests };
}

export async function getTeacherScheduleData(viewer: AppViewer, options: { studentId?: string | null } = {}) {
  if (viewer.role !== Role.TEACHER || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const selectedStudentId = await resolveTeacherStudentContext(viewer.teacherProfileId, options.studentId);
  const studentFilter = selectedStudentId ? { studentId: selectedStudentId } : {};
  const now = new Date();

  const [teacher, students, sessions, classRequests] = await Promise.all([
    db.teacherProfile.findUnique({
      where: { id: viewer.teacherProfileId },
      include: { user: true, availability: true },
    }),
    db.teacherAssignment.findMany({
      where: { teacherId: viewer.teacherProfileId, ...studentFilter },
      include: { student: { include: { user: true } } },
      orderBy: { student: { user: { name: "asc" } } },
    }),
    db.classSession.findMany({
      where: {
        teacherId: viewer.teacherProfileId,
        ...studentFilter,
        startsAtUtc: { gte: subDays(now, 14), lte: addDays(now, 60) },
      },
      include: {
        student: { include: { user: true } },
        recurrence: true,
        classRequest: true,
        lessonNote: { select: { id: true } },
      },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.classRequest.findMany({
      where: {
        teacherId: viewer.teacherProfileId,
        ...studentFilter,
        OR: [
          { status: ClassRequestStatus.PENDING },
          { createdAt: { gte: subDays(now, 30) } },
        ],
      },
      include: {
        student: { include: { user: true } },
        requestedBy: true,
        reviewedBy: true,
        createdSession: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);

  return { teacher, students, sessions, classRequests, selectedStudentId };
}

export async function getClassDetailData(viewer: AppViewer, classId: string) {
  const session = await db.classSession.findUnique({
    where: { id: classId },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      recurrence: true,
      classRequest: { include: { requestedBy: true, reviewedBy: true } },
      lessonNote: { include: { skillRatings: { include: { skillCategory: true } } } },
      practiceAssignments: { include: { skillCategory: true, repertoireItem: true } },
    },
  });

  if (!session) return null;
  if (viewer.role === Role.ADMIN) return session;
  if (viewer.role === Role.TEACHER && viewer.teacherProfileId === session.teacherId) return session;
  if (viewer.role === Role.STUDENT && viewer.studentProfileId === session.studentId) return session;
  return null;
}

export function statusBlocksSchedule(status: SessionStatus) {
  return status !== SessionStatus.CANCELLED;
}
