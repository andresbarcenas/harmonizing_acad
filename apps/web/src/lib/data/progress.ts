import "server-only";

import { PracticeAssignmentStatus, Role, SessionStatus } from "@prisma/client";
import { endOfDay, startOfDay, subDays } from "date-fns";

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
  if (!assignment) throw new Error("UNAUTHORIZED_STUDENT");
}

export async function getTeacherProgressData(viewer: AppViewer, options: { studentId?: string | null } = {}) {
  if (viewer.role !== Role.TEACHER || !viewer.teacherProfileId) {
    throw new Error("Unauthorized: teacher role required");
  }

  const teacherId = viewer.teacherProfileId;
  const selectedStudentId = await resolveAssignedStudentForTeacher(teacherId, options.studentId);
  const since = subDays(new Date(), 14);

  const [assignments, skillCategories] = await Promise.all([
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
      repertoireItems: { where: { teacherId }, orderBy: { updatedAt: "desc" } },
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
    selected,
  };
}

export async function getStudentProgressData(viewer: AppViewer) {
  if (viewer.role !== Role.STUDENT || !viewer.studentProfileId) {
    throw new Error("Unauthorized: student role required");
  }

  const student = await db.studentProfile.findUnique({
    where: { id: viewer.studentProfileId },
    include: {
      user: true,
      assignment: { include: { teacher: { include: { user: true } } } },
      sessions: {
        where: { lessonNote: { isNot: null } },
        include: { lessonNote: { include: { skillRatings: { include: { skillCategory: true } } } } },
        orderBy: { startsAtUtc: "desc" },
        take: 8,
      },
      repertoireItems: { orderBy: { updatedAt: "desc" } },
      practiceAssignments: { include: { repertoireItem: true, skillCategory: true, practiceLogs: true }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] },
      practiceLogs: { include: { assignment: true, repertoireItem: true, skillCategory: true }, orderBy: { practicedOn: "desc" }, take: 20 },
      progressReports: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  const skillCategories = await db.skillCategory.findMany({ where: { active: true }, orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }] });
  return { student, skillCategories };
}

export async function getAdminProgressData(viewer: AppViewer) {
  if (viewer.role !== Role.ADMIN) {
    throw new Error("Unauthorized: admin role required");
  }

  const since = subDays(new Date(), 14);
  const [students, missingLessonNotes, reports, skillCategories] = await Promise.all([
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

  return { students, missingLessonNotes, lowPracticeStudents, reports, skillCategories };
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
