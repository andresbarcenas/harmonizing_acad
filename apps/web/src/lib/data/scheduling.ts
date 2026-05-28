import "server-only";

import { ClassRequestStatus, PracticeAssignmentStatus, RepertoireStatus, Role, SessionStatus, VideoStatus } from "@prisma/client";
import { addDays, subDays } from "date-fns";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { parentCanAccessStudent } from "@/lib/parents";

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
        _count: { select: { attachments: true } },
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
        _count: { select: { attachments: true } },
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
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!session) return null;
  if (viewer.role === Role.ADMIN) return { ...session, teacherPrep: null };
  if (viewer.role === Role.TEACHER && viewer.teacherProfileId === session.teacherId) {
    return { ...session, teacherPrep: await getTeacherClassPrepData(session.studentId, session.teacherId, session.id, session.startsAtUtc, session.lessonFocus) };
  }
  if (viewer.role === Role.STUDENT && viewer.studentProfileId === session.studentId) return { ...session, teacherPrep: null };
  if (viewer.role === Role.PARENT && await parentCanAccessStudent(viewer.parentGuardianProfileId, session.studentId)) return { ...session, teacherPrep: null };
  return null;
}

export function statusBlocksSchedule(status: SessionStatus) {
  return status !== SessionStatus.CANCELLED;
}

async function getTeacherClassPrepData(studentId: string, teacherId: string, classId: string, startsAtUtc: Date, lessonFocus?: string | null) {
  const activeRepertoireStatuses = [
    RepertoireStatus.ASSIGNED,
    RepertoireStatus.LEARNING,
    RepertoireStatus.IMPROVING,
    RepertoireStatus.PERFORMANCE_READY,
  ];
  const activeAssignmentStatuses = [
    PracticeAssignmentStatus.ASSIGNED,
    PracticeAssignmentStatus.IN_PROGRESS,
    PracticeAssignmentStatus.COMPLETED,
    PracticeAssignmentStatus.OVERDUE,
  ];

  const [latestLevel, previousLesson, activeRepertoire, activeAssignments, recentPracticeLogs, recentVideos] = await Promise.all([
    db.progressRecord.findFirst({
      where: { studentId },
      orderBy: { updatedAt: "desc" },
    }),
    db.classSession.findFirst({
      where: {
        id: { not: classId },
        studentId,
        teacherId,
        status: SessionStatus.COMPLETED,
        startsAtUtc: { lt: startsAtUtc },
        lessonNote: { isNot: null },
      },
      include: {
        lessonNote: {
          include: {
            skillRatings: { include: { skillCategory: true }, orderBy: { skillCategory: { sortOrder: "asc" } } },
            practiceAssignments: { include: { repertoireItem: true, skillCategory: true }, orderBy: { createdAt: "desc" } },
          },
        },
      },
      orderBy: { startsAtUtc: "desc" },
    }),
    db.repertoireItem.findMany({
      where: {
        studentId,
        status: { in: activeRepertoireStatuses },
        OR: [{ teacherId }, { teacherId: null }],
      },
      include: {
        attachments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ masteryPercent: "asc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    db.practiceAssignment.findMany({
      where: {
        studentId,
        teacherId,
        status: { in: activeAssignmentStatuses },
      },
      include: {
        repertoireItem: true,
        skillCategory: true,
        practiceLogs: { orderBy: { practicedOn: "desc" }, take: 3 },
        practiceVideos: { orderBy: { submittedAt: "desc" }, take: 2 },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.practiceLog.findMany({
      where: { studentId },
      include: { assignment: true, repertoireItem: true, skillCategory: true },
      orderBy: { practicedOn: "desc" },
      take: 6,
    }),
    db.practiceVideo.findMany({
      where: { studentId, teacherId },
      include: {
        feedback: true,
        practiceAssignment: true,
        repertoireItem: true,
        skillCategory: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 6,
    }),
  ]);

  return {
    latestLevel,
    previousLesson,
    activeRepertoire,
    activeAssignments,
    recentPracticeLogs,
    recentVideos,
    suggestedFocus: buildSuggestedFocus({
      lessonFocus,
      previousLessonFocus: previousLesson?.lessonNote?.nextLessonFocus,
      activeAssignments,
      activeRepertoire,
      recentVideos,
    }),
  };
}

function buildSuggestedFocus({
  lessonFocus,
  previousLessonFocus,
  activeAssignments,
  activeRepertoire,
  recentVideos,
}: {
  lessonFocus?: string | null;
  previousLessonFocus?: string | null;
  activeAssignments: Array<{ title: string; status: PracticeAssignmentStatus; dueDate: Date | null }>;
  activeRepertoire: Array<{ title: string; currentFocusSection: string | null; masteryPercent: number }>;
  recentVideos: Array<{ originalName: string; status: VideoStatus }>;
}) {
  if (lessonFocus?.trim()) return { source: "CLASS_FOCUS" as const, text: lessonFocus.trim() };
  if (previousLessonFocus?.trim()) return { source: "PREVIOUS_LESSON" as const, text: previousLessonFocus.trim() };

  const overdueAssignment = activeAssignments.find((assignment) => assignment.status === PracticeAssignmentStatus.OVERDUE);
  const activeAssignment = overdueAssignment ?? activeAssignments.find((assignment) => assignment.status === PracticeAssignmentStatus.ASSIGNED || assignment.status === PracticeAssignmentStatus.IN_PROGRESS);
  if (activeAssignment) return { source: "ASSIGNMENT" as const, text: activeAssignment.title };

  const focusRepertoire = activeRepertoire.find((item) => item.masteryPercent < 70 || item.currentFocusSection);
  if (focusRepertoire) {
    return { source: "REPERTOIRE" as const, text: focusRepertoire.currentFocusSection ? `${focusRepertoire.title}: ${focusRepertoire.currentFocusSection}` : focusRepertoire.title };
  }

  const pendingVideo = recentVideos.find((video) => video.status === VideoStatus.PENDING);
  if (pendingVideo) return { source: "VIDEO" as const, text: pendingVideo.originalName };

  return { source: "FALLBACK" as const, text: "" };
}
