import "server-only";

import { PracticeAssignmentStatus, ProgressReportStatus, Role, SessionStatus, VideoStatus } from "@prisma/client";
import { endOfDay, startOfDay, startOfWeek, subDays } from "date-fns";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export async function resolveAssignedStudentForTeacher(teacherProfileId: string, studentId?: string | null) {
  if (!studentId) return null;
  const assignment = await db.teacherAssignment.findFirst({
    where: { teacherId: teacherProfileId, studentId },
    select: { studentId: true },
  });
  return assignment?.studentId ?? null;
}

export async function assertTeacherCanAccessStudent(teacherProfileId: string, studentId: string) {
  const assignment = await db.teacherAssignment.findFirst({ where: { teacherId: teacherProfileId, studentId }, select: { id: true } });
  if (!assignment) throw new ProgressDataError("STUDENT_NOT_ASSIGNED", 403);
}

export type ProgressErrorCode =
  | "STUDENT_NOT_ASSIGNED"
  | "STUDENT_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "LESSON_NOTE_NOT_FOUND"
  | "REPERTOIRE_NOT_FOUND"
  | "ASSIGNMENT_NOT_FOUND"
  | "SKILL_NOT_FOUND"
  | "VIDEO_NOT_FOUND";

export class ProgressDataError extends Error {
  constructor(
    public code: ProgressErrorCode,
    public status = 400,
  ) {
    super(code);
    this.name = "ProgressDataError";
  }
}

export function getProgressErrorResponse(error: unknown, locale = "en") {
  if (!(error instanceof ProgressDataError)) return null;
  const es = locale === "es";
  const messages: Record<ProgressErrorCode, string> = {
    STUDENT_NOT_ASSIGNED: es ? "El estudiante no está asignado a esta docente." : "The student is not assigned to this teacher.",
    STUDENT_NOT_FOUND: es ? "Estudiante no encontrado." : "Student not found.",
    SESSION_NOT_FOUND: es ? "Clase no encontrada para este estudiante." : "Class not found for this student.",
    LESSON_NOTE_NOT_FOUND: es ? "Nota de clase no encontrada para este estudiante." : "Lesson note not found for this student.",
    REPERTOIRE_NOT_FOUND: es ? "Repertorio no encontrado para este estudiante." : "Repertoire item not found for this student.",
    ASSIGNMENT_NOT_FOUND: es ? "Tarea no encontrada para este estudiante." : "Assignment not found for this student.",
    SKILL_NOT_FOUND: es ? "Una habilidad seleccionada no existe o no está activa." : "A selected skill does not exist or is inactive.",
    VIDEO_NOT_FOUND: es ? "Video no encontrado para esta docente." : "Video not found for this teacher.",
  };
  return { status: error.status, message: messages[error.code] };
}

export async function assertStudentExists(studentId: string) {
  const student = await db.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw new ProgressDataError("STUDENT_NOT_FOUND", 404);
}

export async function assertActiveSkillCategories(skillCategoryIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set(skillCategoryIds.filter((id): id is string => Boolean(id))));
  if (!ids.length) return;

  const count = await db.skillCategory.count({ where: { id: { in: ids }, active: true } });
  if (count !== ids.length) throw new ProgressDataError("SKILL_NOT_FOUND", 400);
}

export async function assertClassSessionForTeacherStudent(teacherProfileId: string, studentId: string, classSessionId?: string | null) {
  if (!classSessionId) return;
  const session = await db.classSession.findFirst({
    where: { id: classSessionId, teacherId: teacherProfileId, studentId },
    select: { id: true },
  });
  if (!session) throw new ProgressDataError("SESSION_NOT_FOUND", 404);
}

export async function assertLessonNoteForTeacherStudent(teacherProfileId: string, studentId: string, lessonNoteId?: string | null) {
  if (!lessonNoteId) return;
  const note = await db.lessonNote.findFirst({
    where: { id: lessonNoteId, teacherId: teacherProfileId, studentId },
    select: { id: true },
  });
  if (!note) throw new ProgressDataError("LESSON_NOTE_NOT_FOUND", 404);
}

export async function assertRepertoireForTeacherStudent(teacherProfileId: string, studentId: string, repertoireItemId?: string | null) {
  if (!repertoireItemId) return;
  const item = await db.repertoireItem.findFirst({
    where: { id: repertoireItemId, studentId, OR: [{ teacherId: teacherProfileId }, { teacherId: null }] },
    select: { id: true },
  });
  if (!item) throw new ProgressDataError("REPERTOIRE_NOT_FOUND", 404);
}

export async function assertPracticeAssignmentForTeacherStudent(teacherProfileId: string, studentId: string, assignmentId?: string | null) {
  if (!assignmentId) return;
  const assignment = await db.practiceAssignment.findFirst({
    where: { id: assignmentId, studentId, teacherId: teacherProfileId },
    select: { id: true },
  });
  if (!assignment) throw new ProgressDataError("ASSIGNMENT_NOT_FOUND", 404);
}

export async function assertRepertoireForStudent(studentId: string, repertoireItemId?: string | null) {
  if (!repertoireItemId) return;
  const item = await db.repertoireItem.findFirst({ where: { id: repertoireItemId, studentId }, select: { id: true } });
  if (!item) throw new ProgressDataError("REPERTOIRE_NOT_FOUND", 404);
}

export async function assertPracticeAssignmentForStudent(studentId: string, assignmentId?: string | null) {
  if (!assignmentId) return;
  const assignment = await db.practiceAssignment.findFirst({ where: { id: assignmentId, studentId }, select: { id: true } });
  if (!assignment) throw new ProgressDataError("ASSIGNMENT_NOT_FOUND", 404);
}

export async function assertPracticeVideoForTeacher(teacherProfileId: string, videoId: string) {
  const video = await db.practiceVideo.findFirst({ where: { id: videoId, teacherId: teacherProfileId } });
  if (!video) throw new ProgressDataError("VIDEO_NOT_FOUND", 404);
  return video;
}

export async function getTeacherProgressData(viewer: AppViewer, options: { studentId?: string | null } = {}) {
  if (viewer.role !== Role.TEACHER || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const teacherId = viewer.teacherProfileId;
  const selectedStudentId = await resolveAssignedStudentForTeacher(teacherId, options.studentId);
  const since = subDays(new Date(), 14);

  const [assignments, skillCategories, teacher] = await Promise.all([
    db.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        student: {
          include: {
            user: true,
            sessions: {
              where: { teacherId, status: SessionStatus.COMPLETED },
              include: { lessonNote: true },
              orderBy: { startsAtUtc: "desc" },
              take: 8,
            },
            practiceAssignments: { where: { teacherId }, orderBy: { dueDate: "asc" }, take: 6 },
            practiceLogs: { where: { practicedOn: { gte: since } }, orderBy: { practicedOn: "desc" }, take: 6 },
            practiceVideos: { where: { teacherId }, orderBy: { submittedAt: "desc" }, take: 3 },
            progressReports: { where: { teacherId }, orderBy: { createdAt: "desc" }, take: 2 },
          },
        },
      },
      orderBy: { student: { user: { name: "asc" } } },
    }),
    db.skillCategory.findMany({ where: { active: true }, orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }] }),
    db.teacherProfile.findUnique({ where: { id: teacherId }, include: { user: true } }),
  ]);

  if (!selectedStudentId) {
    return {
      selectedStudentId,
      students: assignments.map((assignment) => {
        const completed = assignment.student.sessions;
        const missingNotes = completed.filter((session) => !session.lessonNote).length;
        const practiceMinutes = assignment.student.practiceLogs.reduce((total, log) => total + log.minutesPracticed, 0);
        return {
          assignmentId: assignment.id,
          student: assignment.student,
          missingNotes,
          activeAssignments: assignment.student.practiceAssignments.filter((item) => item.status !== PracticeAssignmentStatus.REVIEWED).length,
          recentPracticeMinutes: practiceMinutes,
          recentVideos: assignment.student.practiceVideos.length,
          latestReport: assignment.student.progressReports[0] ?? null,
        };
      }),
      skillCategories,
      teacher,
      selected: null,
    };
  }

  const selected = await db.studentProfile.findFirst({
    where: { id: selectedStudentId, assignment: { teacherId } },
    include: {
      user: true,
      sessions: {
        where: { teacherId },
        include: {
          lessonNote: { include: { skillRatings: { include: { skillCategory: true } }, practiceAssignments: true } },
        },
        orderBy: { startsAtUtc: "desc" },
        take: 12,
      },
      repertoireItems: { where: { teacherId }, include: { attachments: { orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" } },
      practiceAssignments: {
        where: { teacherId },
        include: { repertoireItem: true, skillCategory: true, practiceLogs: true },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      },
      practiceLogs: {
        include: { assignment: true, repertoireItem: true, skillCategory: true },
        orderBy: { practicedOn: "desc" },
        take: 20,
      },
      progressReports: { where: { teacherId }, orderBy: { createdAt: "desc" }, take: 8 },
      practiceVideos: {
        where: { teacherId },
        include: { feedback: { include: { skillRatings: { include: { skillCategory: true } } } }, repertoireItem: true, skillCategory: true, practiceAssignment: true },
        orderBy: { submittedAt: "desc" },
        take: 8,
      },
    },
  });

  return {
    selectedStudentId,
    students: assignments.map((assignment) => ({ assignmentId: assignment.id, student: assignment.student })),
    skillCategories,
    teacher,
    selected,
  };
}

export async function getTeacherClassCompletionData(viewer: AppViewer, classId: string) {
  if (viewer.role !== Role.TEACHER || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: viewer.teacherProfileId,
      student: { assignment: { teacherId: viewer.teacherProfileId } },
    },
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
      lessonNote: {
        include: {
          skillRatings: { include: { skillCategory: true }, orderBy: { skillCategory: { sortOrder: "asc" } } },
          practiceAssignments: { include: { repertoireItem: true, skillCategory: true }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!session) throw new ProgressDataError("SESSION_NOT_FOUND", 404);

  const [skillCategories, repertoireItems] = await Promise.all([
    db.skillCategory.findMany({
      where: { active: true, instrument: { in: ["GENERAL", "PIANO", "VOICE"] } },
      orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }],
    }),
    db.repertoireItem.findMany({
      where: {
        studentId: session.studentId,
        OR: [{ teacherId: viewer.teacherProfileId }, { teacherId: null }],
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  return { session, skillCategories, repertoireItems };
}

export async function getStudentProgressData(viewer: AppViewer) {
  if (viewer.role !== Role.STUDENT || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const student = await db.studentProfile.findUnique({
    where: { id: viewer.studentProfileId },
    include: {
      user: true,
      assignment: { include: { teacher: { include: { user: true } } } },
      sessions: {
        where: { status: SessionStatus.COMPLETED, lessonNote: { isNot: null } },
        include: { lessonNote: { include: { skillRatings: { include: { skillCategory: true } } } } },
        orderBy: { startsAtUtc: "desc" },
        take: 8,
      },
      repertoireItems: {
        include: {
          attachments: { orderBy: { createdAt: "desc" } },
          practiceAssignments: { orderBy: { createdAt: "desc" }, take: 1 },
          practiceVideos: {
            include: { feedback: { include: { skillRatings: { include: { skillCategory: true } } } } },
            orderBy: { submittedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      practiceAssignments: {
        include: {
          repertoireItem: true,
          skillCategory: true,
          practiceLogs: true,
          practiceVideos: { orderBy: { submittedAt: "desc" }, take: 1 },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      },
      practiceLogs: { include: { assignment: true, repertoireItem: true, skillCategory: true }, orderBy: { practicedOn: "desc" }, take: 20 },
      progressReports: { where: { status: ProgressReportStatus.PUBLISHED }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 6 },
      practiceVideos: {
        include: {
          practiceAssignment: true,
          repertoireItem: true,
          skillCategory: true,
          feedback: { include: { skillRatings: { include: { skillCategory: true } } } },
        },
        orderBy: { submittedAt: "desc" },
        take: 12,
      },
    },
  });

  const [skillCategories, nextClass] = await Promise.all([
    db.skillCategory.findMany({ where: { active: true }, orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }] }),
    db.classSession.findFirst({
      where: {
        studentId: viewer.studentProfileId,
        startsAtUtc: { gte: now },
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
      },
      include: { teacher: { include: { user: true } } },
      orderBy: { startsAtUtc: "asc" },
    }),
  ]);

  const practiceMinutesThisWeek = student?.practiceLogs
    .filter((log) => log.practicedOn >= weekStart)
    .reduce((total, log) => total + log.minutesPracticed, 0) ?? 0;

  const pendingVideoAssignments = student?.practiceAssignments.filter((assignment) =>
    assignment.requiresVideo &&
    !assignment.practiceVideos.some((video) => video.status === VideoStatus.PENDING || video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN),
  ) ?? [];

  return { student, skillCategories, nextClass, practiceMinutesThisWeek, pendingVideoAssignments };
}

export async function getAdminProgressData(viewer: AppViewer) {
  if (viewer.role !== Role.ADMIN) {
    throw new Error("Unauthorized: admin role required");
  }

  const since = subDays(new Date(), 14);
  const [students, missingLessonNotes, recentCompletedSessions, reports, skillCategories] = await Promise.all([
    db.studentProfile.findMany({
      include: {
        user: true,
        assignment: { include: { teacher: { include: { user: true } } } },
        practiceLogs: { where: { practicedOn: { gte: since } } },
        progressReports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { user: { name: "asc" } },
    }),
    db.classSession.findMany({
      where: { status: SessionStatus.COMPLETED, lessonNote: { is: null } },
      include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
      orderBy: { startsAtUtc: "desc" },
      take: 20,
    }),
    db.classSession.findMany({
      where: { status: { in: [SessionStatus.COMPLETED, SessionStatus.NO_SHOW, SessionStatus.CANCELLED, SessionStatus.RESCHEDULE_PENDING] } },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        lessonNote: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    db.progressReport.findMany({
      include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.skillCategory.findMany({ orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }] }),
  ]);

  const lowPracticeStudents = students
    .map((student) => ({
      student,
      minutes: student.practiceLogs.reduce((total, log) => total + log.minutesPracticed, 0),
      latestReport: student.progressReports[0] ?? null,
    }))
    .filter((item) => item.minutes < 30);

  return { students, missingLessonNotes, recentCompletedSessions, lowPracticeStudents, reports, skillCategories };
}

export async function calculateProgressReportMetrics(studentId: string, startDate: Date, endDate: Date) {
  const range = { gte: startOfDay(startDate), lte: endOfDay(endDate) };
  const [sessions, practiceLogs, assignments, videos, lessonRatings, videoRatings, repertoire] = await Promise.all([
    db.classSession.findMany({ where: { studentId, startsAtUtc: range } }),
    db.practiceLog.findMany({ where: { studentId, practicedOn: range } }),
    db.practiceAssignment.findMany({ where: { studentId, assignedDate: range } }),
    db.practiceVideo.findMany({ where: { studentId, submittedAt: range } }),
    db.lessonSkillRating.findMany({
      where: { lessonNote: { studentId, session: { startsAtUtc: range } } },
      include: { skillCategory: true },
    }),
    db.videoSkillRating.findMany({
      where: { videoFeedback: { video: { studentId, submittedAt: range } } },
      include: { skillCategory: true },
    }),
    db.repertoireItem.findMany({ where: { studentId } }),
  ]);

  const completedLessons = sessions.filter((session) => session.status === SessionStatus.COMPLETED);
  const missedCancelled = sessions.filter((session) => session.status === SessionStatus.NO_SHOW || session.status === SessionStatus.CANCELLED);
  const completedAssignments = assignments.filter((assignment) => assignment.status === PracticeAssignmentStatus.COMPLETED || assignment.status === PracticeAssignmentStatus.REVIEWED);
  const lessonNotes = await db.lessonNote.findMany({ where: { studentId, session: { startsAtUtc: range }, overallLessonRating: { not: null } } });
  const averageLessonRating = average(lessonNotes.map((note) => note.overallLessonRating).filter((value): value is number => typeof value === "number"));

  const skillBuckets = new Map<string, number[]>();
  for (const rating of [...lessonRatings, ...videoRatings]) {
    const bucket = skillBuckets.get(rating.skillCategory.name) ?? [];
    bucket.push(rating.rating);
    skillBuckets.set(rating.skillCategory.name, bucket);
  }
  const averageSkillRatings = Object.fromEntries(Array.from(skillBuckets.entries()).map(([name, values]) => [name, Number(average(values)?.toFixed(2) ?? 0)]));

  const byStatus = repertoire.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    attendanceCount: completedLessons.length + sessions.filter((session) => session.status === SessionStatus.NO_SHOW).length,
    completedLessonsCount: completedLessons.length,
    missedCancelledCount: missedCancelled.length,
    totalPracticeMinutes: practiceLogs.reduce((total, log) => total + log.minutesPracticed, 0),
    practiceAssignmentCompletionRate: assignments.length ? Math.round((completedAssignments.length / assignments.length) * 100) : 0,
    videoSubmissionsCount: videos.length,
    averageLessonRating,
    averageSkillRatings,
    repertoireProgressSummary: {
      activeItems: repertoire.filter((item) => item.status !== "COMPLETED" && item.status !== "PAUSED").length,
      averageMasteryPercent: Math.round(average(repertoire.map((item) => item.masteryPercent)) ?? 0),
      byStatus,
    },
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function inferSkillInstruments(preferredInstrument?: string | null) {
  const normalized = (preferredInstrument ?? "").toLocaleLowerCase();
  const instruments = new Set(["GENERAL"]);

  if (normalized.includes("piano") || normalized.includes("teclado") || normalized.includes("keyboard")) {
    instruments.add("PIANO");
  }

  if (normalized.includes("voz") || normalized.includes("vocal") || normalized.includes("canto") || normalized.includes("sing")) {
    instruments.add("VOICE");
  }

  if (instruments.size === 1) {
    instruments.add("PIANO");
    instruments.add("VOICE");
  }

  return Array.from(instruments);
}

export function inferLessonInstrument(value?: string | null): "PIANO" | "VOICE" {
  const normalized = (value ?? "").toLocaleLowerCase();
  if (normalized.includes("voz") || normalized.includes("vocal") || normalized.includes("canto") || normalized.includes("sing")) {
    return "VOICE";
  }
  return "PIANO";
}

export function skillInstrumentsForLesson(value?: string | null) {
  return ["GENERAL", inferLessonInstrument(value)] as const;
}
