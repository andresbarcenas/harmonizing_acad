import "server-only";

export const REPORT_RUBRIC_VERSION = "default-v1";

export type ReportCategoryKey = "attendance" | "practiceConsistency" | "assignmentCompletion" | "skillProgress" | "repertoireProgress" | "effortFocus";

export type ReportCategoryScore = {
  key: ReportCategoryKey;
  label: { en: string; es: string };
  weight: number;
  score: number | null;
  weightedScore: number;
  explanation: { en: string; es: string };
  insufficientData?: boolean;
};

export type GradeCalculationInput = {
  totalScheduledClasses: number;
  completedLessonsCount: number;
  missedLessonsCount: number;
  cancelledLessonsCount: number;
  totalPracticeMinutes: number;
  practiceLogCount: number;
  practiceAssignmentCount: number;
  completedAssignmentCount: number;
  overdueAssignmentCount: number;
  averageSkillRating: number | null;
  averageSkillTrendDelta: number | null;
  repertoireWorkedCount: number;
  repertoireCompletedCount: number;
  averageRepertoireMastery: number | null;
  averagePreparednessRating: number | null;
  averageFocusRating: number | null;
  averageEffortRating: number | null;
  weekCount: number;
};

export type GradeCalculationResult = {
  gradePercentage: number | null;
  gradeLetter: string | null;
  categoryScores: Record<ReportCategoryKey, ReportCategoryScore>;
};

const NEUTRAL_OPTIONAL_SCORE = 85;

const categoryLabels: Record<ReportCategoryKey, { en: string; es: string }> = {
  attendance: { en: "Attendance", es: "Asistencia" },
  practiceConsistency: { en: "Practice consistency", es: "Constancia de práctica" },
  assignmentCompletion: { en: "Assignment completion", es: "Cumplimiento de tareas" },
  skillProgress: { en: "Skill progress", es: "Progreso de habilidades" },
  repertoireProgress: { en: "Repertoire progress", es: "Progreso de repertorio" },
  effortFocus: { en: "Effort and focus", es: "Esfuerzo y enfoque" },
};

const weights: Record<ReportCategoryKey, number> = {
  attendance: 0.15,
  practiceConsistency: 0.2,
  assignmentCompletion: 0.2,
  skillProgress: 0.25,
  repertoireProgress: 0.1,
  effortFocus: 0.1,
};

export function calculateReportGrade(input: GradeCalculationInput): GradeCalculationResult {
  const effectiveClasses = Math.max(0, input.totalScheduledClasses - input.cancelledLessonsCount);
  if (input.totalScheduledClasses === 0 || effectiveClasses === 0) {
    return {
      gradePercentage: null,
      gradeLetter: null,
      categoryScores: buildCategoryScores({
        attendance: insufficient("No hay clases programadas en este rango.", "No scheduled classes in this range."),
        practiceConsistency: insufficient("Sin datos suficientes.", "Not enough data."),
        assignmentCompletion: insufficient("Sin datos suficientes.", "Not enough data."),
        skillProgress: insufficient("Sin datos suficientes.", "Not enough data."),
        repertoireProgress: insufficient("Sin datos suficientes.", "Not enough data."),
        effortFocus: insufficient("Sin datos suficientes.", "Not enough data."),
      }),
    };
  }

  const attendanceScore = clampScore((input.completedLessonsCount / effectiveClasses) * 100);
  const avgWeeklyMinutes = input.weekCount > 0 ? input.totalPracticeMinutes / input.weekCount : 0;
  const avgWeeklyLogs = input.weekCount > 0 ? input.practiceLogCount / input.weekCount : 0;
  const practiceScore = clampScore(Math.min(avgWeeklyMinutes / 60, 1) * 70 + Math.min(avgWeeklyLogs / 3, 1) * 30);

  const assignmentScore = input.practiceAssignmentCount > 0
    ? clampScore((input.completedAssignmentCount / input.practiceAssignmentCount) * 100 - Math.min(input.overdueAssignmentCount * 8, 24))
    : NEUTRAL_OPTIONAL_SCORE;

  const skillScore = input.averageSkillRating === null
    ? NEUTRAL_OPTIONAL_SCORE
    : clampScore((input.averageSkillRating / 5) * 82 + trendBonus(input.averageSkillTrendDelta));

  const repertoireScore = input.repertoireWorkedCount > 0
    ? clampScore(((input.averageRepertoireMastery ?? 0) * 0.75) + ((input.repertoireCompletedCount / input.repertoireWorkedCount) * 25))
    : NEUTRAL_OPTIONAL_SCORE;

  const effortValues = [input.averagePreparednessRating, input.averageFocusRating, input.averageEffortRating].filter((value): value is number => typeof value === "number");
  const effortScore = effortValues.length ? clampScore((average(effortValues) / 5) * 100) : NEUTRAL_OPTIONAL_SCORE;

  const categoryScores = buildCategoryScores({
    attendance: scored(attendanceScore, `Asistió a ${input.completedLessonsCount} de ${effectiveClasses} clases no canceladas.`, `Attended ${input.completedLessonsCount} of ${effectiveClasses} non-cancelled lessons.`),
    practiceConsistency: scored(practiceScore, `${input.totalPracticeMinutes} minutos y ${input.practiceLogCount} registros de práctica.`, `${input.totalPracticeMinutes} minutes and ${input.practiceLogCount} practice logs.`),
    assignmentCompletion: scored(assignmentScore, input.practiceAssignmentCount ? `${input.completedAssignmentCount} de ${input.practiceAssignmentCount} tareas completadas.` : "No hubo tareas asignadas; se usa puntaje neutral.", input.practiceAssignmentCount ? `${input.completedAssignmentCount} of ${input.practiceAssignmentCount} assignments completed.` : "No assignments were assigned; neutral score used."),
    skillProgress: scored(skillScore, input.averageSkillRating === null ? "Sin calificaciones de habilidad; se usa puntaje neutral." : `Promedio de habilidad ${input.averageSkillRating.toFixed(1)}/5.`, input.averageSkillRating === null ? "No skill ratings; neutral score used." : `Skill average ${input.averageSkillRating.toFixed(1)}/5.`),
    repertoireProgress: scored(repertoireScore, input.repertoireWorkedCount ? `${input.repertoireWorkedCount} canciones trabajadas, ${input.repertoireCompletedCount} completadas.` : "Sin repertorio trabajado; se usa puntaje neutral.", input.repertoireWorkedCount ? `${input.repertoireWorkedCount} songs worked on, ${input.repertoireCompletedCount} completed.` : "No repertoire worked on; neutral score used."),
    effortFocus: scored(effortScore, effortValues.length ? `Promedio de preparación/enfoque/esfuerzo ${average(effortValues).toFixed(1)}/5.` : "Sin ratings de esfuerzo; se usa puntaje neutral.", effortValues.length ? `Preparedness/focus/effort average ${average(effortValues).toFixed(1)}/5.` : "No effort ratings; neutral score used."),
  });

  const gradePercentage = Math.round(Object.values(categoryScores).reduce((total, item) => total + item.weightedScore, 0));
  return { gradePercentage, gradeLetter: letterGrade(gradePercentage), categoryScores };
}

function buildCategoryScores(items: Record<ReportCategoryKey, Omit<ReportCategoryScore, "key" | "label" | "weight" | "weightedScore">>) {
  return Object.fromEntries(
    (Object.keys(items) as ReportCategoryKey[]).map((key) => {
      const item = items[key];
      const weightedScore = item.score === null ? 0 : item.score * weights[key];
      return [key, { key, label: categoryLabels[key], weight: weights[key], weightedScore: round(weightedScore), ...item }];
    }),
  ) as Record<ReportCategoryKey, ReportCategoryScore>;
}

function scored(score: number, es: string, en: string) {
  return { score: round(score), explanation: { es, en } };
}

function insufficient(es: string, en: string) {
  return { score: null, explanation: { es, en }, insufficientData: true };
}

function trendBonus(delta: number | null) {
  if (delta === null) return 8;
  if (delta >= 0.75) return 18;
  if (delta >= 0.25) return 12;
  if (delta >= -0.24) return 8;
  if (delta >= -0.74) return 2;
  return -6;
}

function letterGrade(score: number) {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
