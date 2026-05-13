import "server-only";

import { ClassSessionType, PracticeAssignmentStatus, ProgressReportStatus, SessionStatus, VideoStatus } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { calculateReportGrade, REPORT_RUBRIC_VERSION } from "@/lib/progress-reports/rubric";

export class ProgressReportConflictError extends Error {
  constructor(public reportId: string) {
    super("REPORT_ALREADY_EXISTS");
    this.name = "ProgressReportConflictError";
  }
}

export type GenerateProgressReportInput = {
  studentId: string;
  teacherId?: string | null;
  generatedByUserId: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string | null;
  regenerate?: boolean;
  teacherSummary?: string | null;
  strengths?: string | null;
  improvementAreas?: string | null;
  recommendedNextFocus?: string | null;
  studentVisibleSummary?: string | null;
  adminNote?: string | null;
};

export function monthlyReportRange(date = new Date(), timezone = "America/New_York") {
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  const localMonth = new Intl.DateTimeFormat("en-CA", { timeZone: normalizedTimezone, year: "numeric", month: "2-digit" }).format(date);
  const [year, month] = localMonth.split("-").map(Number);
  return reportRangeFromMonth(`${year}-${String(month).padStart(2, "0")}`, normalizedTimezone);
}

export function reportRangeFromMonth(month: string, timezone = "America/New_York") {
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return {
    startDate: fromZonedTime(`${month}-01T00:00:00.000`, normalizedTimezone),
    endDate: fromZonedTime(`${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999`, normalizedTimezone),
  };
}

export function reportRangeFromDateStrings(startDate: string, endDate: string, timezone = "America/New_York") {
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  return {
    startDate: fromZonedTime(`${startDate}T00:00:00.000`, normalizedTimezone),
    endDate: fromZonedTime(`${endDate}T23:59:59.999`, normalizedTimezone),
  };
}

export function buildProgressReportKey(studentId: string, teacherId: string | null | undefined, startDate: Date, endDate: Date) {
  return `${studentId}:${teacherId ?? "academy"}:${startDate.toISOString()}:${endDate.toISOString()}`;
}

export async function generateProgressReport(input: GenerateProgressReportInput) {
  const timezone = normalizeIanaTimezone(input.timezone ?? "America/New_York");
  const range = input.startDate && input.endDate ? { startDate: input.startDate, endDate: input.endDate } : monthlyReportRange(new Date(), timezone);
  const startDate = range.startDate;
  const endDate = range.endDate;

  const student = await db.studentProfile.findUnique({
    where: { id: input.studentId },
    include: { user: true, assignment: true },
  });
  if (!student) throw new Error("STUDENT_NOT_FOUND");

  const teacherId = input.teacherId ?? student.assignment?.teacherId ?? null;
  const reportKey = buildProgressReportKey(input.studentId, teacherId, startDate, endDate);
  const existing = await db.progressReport.findUnique({ where: { reportKey } });
  if (existing && !input.regenerate) throw new ProgressReportConflictError(existing.id);

  const metrics = await calculateMonthlyReportSnapshot({ studentId: input.studentId, teacherId, startDate, endDate });
  const defaults = buildNarrativeDefaults(student.user.name, metrics);
  const narrative = {
    teacherSummary: input.teacherSummary ?? existing?.teacherSummary ?? defaults.teacherSummary,
    strengths: input.strengths ?? existing?.strengths ?? defaults.strengths,
    improvementAreas: input.improvementAreas ?? existing?.improvementAreas ?? defaults.improvementAreas,
    recommendedNextFocus: input.recommendedNextFocus ?? existing?.recommendedNextFocus ?? defaults.recommendedNextFocus,
    studentVisibleSummary: input.studentVisibleSummary ?? existing?.studentVisibleSummary ?? defaults.studentVisibleSummary,
    adminNote: input.adminNote ?? existing?.adminNote ?? undefined,
  };

  const data = {
    studentId: input.studentId,
    teacherId,
    generatedByUserId: input.generatedByUserId,
    reportKey,
    startDate,
    endDate,
    status: existing?.status ?? ProgressReportStatus.DRAFT,
    generatedAt: new Date(),
    rubricVersion: REPORT_RUBRIC_VERSION,
    ...metrics,
    ...narrative,
    finalGrade: metrics.gradeLetter,
  };

  if (existing) {
    return db.progressReport.update({ where: { id: existing.id }, data });
  }

  return db.progressReport.create({ data });
}

async function calculateMonthlyReportSnapshot({ studentId, teacherId, startDate, endDate }: { studentId: string; teacherId?: string | null; startDate: Date; endDate: Date }) {
  const range = { gte: startDate, lte: endDate };
  const teacherWhere = teacherId ? { teacherId } : {};
  const [sessions, practiceLogs, assignments, videos, lessonRatings, videoRatings, repertoire, feedback] = await Promise.all([
    db.classSession.findMany({
      where: { studentId, startsAtUtc: range, ...teacherWhere },
      include: { lessonNote: true },
      orderBy: { startsAtUtc: "asc" },
    }),
    db.practiceLog.findMany({ where: { studentId, practicedOn: range }, orderBy: { practicedOn: "asc" } }),
    db.practiceAssignment.findMany({ where: { studentId, assignedDate: range, ...teacherWhere }, orderBy: { assignedDate: "asc" } }),
    db.practiceVideo.findMany({ where: { studentId, submittedAt: range, ...teacherWhere }, include: { feedback: true }, orderBy: { submittedAt: "asc" } }),
    db.lessonSkillRating.findMany({
      where: { lessonNote: { studentId, session: { startsAtUtc: range, ...teacherWhere } } },
      include: { skillCategory: true },
      orderBy: { createdAt: "asc" },
    }),
    db.videoSkillRating.findMany({
      where: { videoFeedback: { video: { studentId, submittedAt: range, ...teacherWhere } } },
      include: { skillCategory: true },
      orderBy: { createdAt: "asc" },
    }),
    db.repertoireItem.findMany({
      where: {
        studentId,
        AND: [
          {
            OR: [
              { createdAt: { lte: endDate }, updatedAt: { gte: startDate } },
              { startDate: { lte: endDate } },
              { completedDate: range },
            ],
          },
          teacherId ? { OR: [{ teacherId }, { teacherId: null }] } : {},
        ],
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.videoFeedback.findMany({
      where: { video: { studentId, submittedAt: range, ...teacherWhere } },
      include: { video: true },
      orderBy: { reviewedAt: "desc" },
      take: 5,
    }),
  ]);

  const completedSessions = sessions.filter((session) => session.status === SessionStatus.COMPLETED);
  const missedSessions = sessions.filter((session) => session.status === SessionStatus.NO_SHOW);
  const cancelledSessions = sessions.filter((session) => session.status === SessionStatus.CANCELLED);
  const lessonNotesCompleted = completedSessions.filter((session) => session.lessonNote).length;
  const missingLessonNotes = Math.max(0, completedSessions.length - lessonNotesCompleted);
  const completedAssignments = assignments.filter((assignment) => assignment.status === PracticeAssignmentStatus.COMPLETED || assignment.status === PracticeAssignmentStatus.REVIEWED);
  const overdueAssignments = assignments.filter((assignment) => assignment.status === PracticeAssignmentStatus.OVERDUE || (assignment.dueDate && assignment.dueDate <= endDate && assignment.status !== PracticeAssignmentStatus.COMPLETED && assignment.status !== PracticeAssignmentStatus.REVIEWED));
  const reviewedVideos = videos.filter((video) => video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN || video.reviewedAt || video.feedback.length);
  const workedRepertoire = repertoire.filter((item) => item.status !== "PAUSED");
  const completedRepertoire = repertoire.filter((item) => item.status === "COMPLETED" || (item.completedDate && item.completedDate >= startDate && item.completedDate <= endDate));
  const lessonNotesWithRatings = sessions.map((session) => session.lessonNote).filter(Boolean);
  const skillSummary = buildSkillSummary([...lessonRatings, ...videoRatings]);
  const averageSkillRatings = Object.fromEntries(skillSummary.items.map((item) => [item.name, item.latestAverage]));
  const averageSkillRating = average(skillSummary.items.map((item) => item.latestAverage));
  const skillTrendValues = skillSummary.items.filter((item) => typeof item.delta === "number").map((item) => item.delta as number);
  const averageSkillTrendDelta = average(skillTrendValues);
  const averageRepertoireMastery = average(workedRepertoire.map((item) => item.masteryPercent));
  const weekCount = Math.max(1, Math.ceil((differenceInCalendarDays(endDate, startDate) + 1) / 7));
  const totalPracticeMinutes = practiceLogs.reduce((total, log) => total + log.minutesPracticed, 0);
  const practiceAssignmentCompletionRate = assignments.length ? Math.round((completedAssignments.length / assignments.length) * 100) : 0;

  const averages = {
    averageLessonRating: average(lessonNotesWithRatings.map((note) => note?.overallLessonRating).filter(isNumber)),
    averagePreparednessRating: average(lessonNotesWithRatings.map((note) => note?.preparednessRating).filter(isNumber)),
    averageFocusRating: average(lessonNotesWithRatings.map((note) => note?.focusRating).filter(isNumber)),
    averageEffortRating: average(lessonNotesWithRatings.map((note) => note?.effortRating).filter(isNumber)),
  };

  const grade = calculateReportGrade({
    totalScheduledClasses: sessions.length,
    completedLessonsCount: completedSessions.length,
    missedLessonsCount: missedSessions.length,
    cancelledLessonsCount: cancelledSessions.length,
    totalPracticeMinutes,
    practiceLogCount: practiceLogs.length,
    practiceAssignmentCount: assignments.length,
    completedAssignmentCount: completedAssignments.length,
    overdueAssignmentCount: overdueAssignments.length,
    averageSkillRating,
    averageSkillTrendDelta,
    repertoireWorkedCount: workedRepertoire.length,
    repertoireCompletedCount: completedRepertoire.length,
    averageRepertoireMastery,
    averagePreparednessRating: averages.averagePreparednessRating,
    averageFocusRating: averages.averageFocusRating,
    averageEffortRating: averages.averageEffortRating,
    weekCount,
  });

  const attendanceSummary = {
    totalScheduled: sessions.length,
    completed: completedSessions.length,
    missed: missedSessions.length,
    cancelled: cancelledSessions.length,
    recurring: sessions.filter((session) => session.type === ClassSessionType.RECURRING || session.recurrenceId).length,
    single: sessions.filter((session) => session.type !== ClassSessionType.RECURRING && !session.recurrenceId).length,
    lessonNotesCompleted,
    missingLessonNotes,
  };
  const practiceSummary = {
    totalMinutes: totalPracticeMinutes,
    logCount: practiceLogs.length,
    assignmentCount: assignments.length,
    completedAssignmentCount: completedAssignments.length,
    overdueAssignmentCount: overdueAssignments.length,
    completionRate: practiceAssignmentCompletionRate,
    averageMinutesPerWeek: Math.round(totalPracticeMinutes / weekCount),
  };
  const videoSummary = {
    submitted: videos.length,
    reviewed: reviewedVideos.length,
    pending: Math.max(0, videos.length - reviewedVideos.length),
    highlights: feedback.map((item) => ({ comment: item.comment, reviewedAt: item.reviewedAt, videoId: item.videoId })),
  };
  const repertoireSummary = {
    worked: workedRepertoire.length,
    completed: completedRepertoire.length,
    averageMasteryPercent: Math.round(averageRepertoireMastery ?? 0),
    items: workedRepertoire.slice(0, 8).map((item) => ({ id: item.id, title: item.title, status: item.status, masteryPercent: item.masteryPercent, focus: item.currentFocusSection })),
  };

  return {
    totalScheduledClasses: sessions.length,
    attendanceCount: completedSessions.length + missedSessions.length,
    completedLessonsCount: completedSessions.length,
    missedLessonsCount: missedSessions.length,
    cancelledLessonsCount: cancelledSessions.length,
    missedCancelledCount: missedSessions.length + cancelledSessions.length,
    singleClassesCount: attendanceSummary.single,
    recurringClassesCount: attendanceSummary.recurring,
    lessonNotesCompletedCount: lessonNotesCompleted,
    missingLessonNotesCount: missingLessonNotes,
    totalPracticeMinutes,
    practiceLogCount: practiceLogs.length,
    practiceAssignmentCount: assignments.length,
    completedAssignmentCount: completedAssignments.length,
    practiceAssignmentCompletionRate,
    overdueAssignmentCount: overdueAssignments.length,
    videoSubmissionsCount: videos.length,
    reviewedVideoCount: reviewedVideos.length,
    repertoireWorkedCount: workedRepertoire.length,
    repertoireCompletedCount: completedRepertoire.length,
    ...averages,
    averageSkillRatings,
    categoryScores: grade.categoryScores,
    skillSummary,
    attendanceSummary,
    practiceSummary,
    videoSummary,
    repertoireSummary,
    repertoireProgressSummary: {
      activeItems: workedRepertoire.filter((item) => item.status !== "COMPLETED").length,
      averageMasteryPercent: Math.round(averageRepertoireMastery ?? 0),
      byStatus: repertoire.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {}),
    },
    gradePercentage: grade.gradePercentage,
    gradeLetter: grade.gradeLetter,
  };
}

function buildSkillSummary(ratings: Array<{ rating: number; note: string | null; createdAt: Date; skillCategoryId: string; skillCategory: { name: string; instrument: string } }>) {
  const buckets = new Map<string, Array<(typeof ratings)[number]>>();
  for (const rating of ratings) {
    const current = buckets.get(rating.skillCategoryId) ?? [];
    current.push(rating);
    buckets.set(rating.skillCategoryId, current);
  }

  const items = Array.from(buckets.entries()).map(([skillCategoryId, values]) => {
    const sorted = values.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const midpoint = Math.max(1, Math.floor(sorted.length / 2));
    const firstAverage = average(sorted.slice(0, midpoint).map((item) => item.rating));
    const lastAverage = average(sorted.slice(midpoint).map((item) => item.rating)) ?? firstAverage;
    const delta = firstAverage !== null && lastAverage !== null && sorted.length >= 2 ? Number((lastAverage - firstAverage).toFixed(2)) : null;
    return {
      skillCategoryId,
      name: sorted[0].skillCategory.name,
      instrument: sorted[0].skillCategory.instrument,
      latestAverage: Number((lastAverage ?? firstAverage ?? 0).toFixed(2)),
      firstAverage: firstAverage ? Number(firstAverage.toFixed(2)) : null,
      lastAverage: lastAverage ? Number(lastAverage.toFixed(2)) : null,
      delta,
      trend: trendFromDelta(delta),
      ratingCount: sorted.length,
      recentNotes: sorted.slice(-3).map((item) => item.note).filter(Boolean),
    };
  }).sort((a, b) => a.latestAverage - b.latestAverage);

  return {
    items,
    strongest: [...items].sort((a, b) => b.latestAverage - a.latestAverage).slice(0, 3),
    needsPractice: items.filter((item) => item.latestAverage < 3.5).slice(0, 3),
    insufficientData: items.length === 0,
  };
}

function trendFromDelta(delta: number | null) {
  if (delta === null) return "INSUFFICIENT";
  if (delta >= 0.25) return "UP";
  if (delta <= -0.25) return "DOWN";
  return "FLAT";
}

function buildNarrativeDefaults(studentName: string, metrics: Awaited<ReturnType<typeof calculateMonthlyReportSnapshot>>) {
  const strengths = metrics.skillSummary.strongest.map((item) => item.name).join(", ");
  const needsPractice = metrics.skillSummary.needsPractice.map((item) => item.name).join(", ");
  return {
    teacherSummary: `${studentName} completó ${metrics.completedLessonsCount} clase(s) en este período, registró ${metrics.totalPracticeMinutes} minutos de práctica y trabajó ${metrics.repertoireWorkedCount} canción(es) o pieza(s).`,
    strengths: strengths ? `Áreas fuertes observadas: ${strengths}.` : "Aún no hay suficientes datos de habilidades; revisar en la próxima clase.",
    improvementAreas: needsPractice ? `Áreas que necesitan práctica: ${needsPractice}.` : "Mantener constancia y seguir reforzando los objetivos actuales.",
    recommendedNextFocus: metrics.missingLessonNotesCount > 0 ? "Completar notas pendientes y reforzar la práctica guiada antes del próximo reporte." : "Continuar con práctica constante, revisión de tareas y seguimiento del repertorio actual.",
    studentVisibleSummary: `${studentName} muestra un progreso medible este período. Revisa la asistencia, práctica, tareas y canciones trabajadas para preparar el siguiente mes.`,
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
