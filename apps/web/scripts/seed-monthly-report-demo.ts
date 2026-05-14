import {
  Prisma,
  ClassSessionType,
  NotificationType,
  PracticeAssignmentStatus,
  PrismaClient,
  ProgressReportStatus,
  RepertoireStatus,
  SessionStatus,
  VideoStatus,
} from "@prisma/client";
import { addDays, addHours, subDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();
const SOURCE = "seed_monthly_report_demo";
const TEACHER_EMAIL = "maria@harmonizing.com";
const ADMIN_EMAIL = "admin@harmonizing.com";
const FORCE = process.argv.includes("--force");

type TeacherWithProfile = Prisma.UserGetPayload<{ include: { teacherProfile: true } }> & {
  teacherProfile: NonNullable<Prisma.UserGetPayload<{ include: { teacherProfile: true } }>["teacherProfile"]>;
};

type StudentWithProfile = Prisma.UserGetPayload<{ include: { studentProfile: { include: { assignment: true } } } }> & {
  studentProfile: NonNullable<Prisma.UserGetPayload<{ include: { studentProfile: { include: { assignment: true } } } }>["studentProfile"]>;
};

type BasicUser = Prisma.UserGetPayload<Record<string, never>>;

type DemoStudent = {
  slug: "isabella" | "luis" | "tommy";
  email: string;
  instrument: "Piano" | "Voz";
  timezone: string;
  profile: "strong-piano" | "voice-consistency" | "historical-piano";
  repertoire: {
    title: string;
    composerOrArtist: string;
    level: string;
    status: RepertoireStatus;
    previousMastery: number;
    currentMastery: number;
    focus: string;
    currentTempo?: number;
    targetTempo?: number;
  };
  skillNames: string[];
};

type ReportScenario = {
  period: "previous" | "current";
  status: ProgressReportStatus;
  grade: number;
  completed: number;
  missed: number;
  cancelled: number;
  totalPracticeMinutes: number;
  practiceLogCount: number;
  assignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  videos: number;
  reviewedVideos: number;
  lessonNotesCompleted: number;
  missingLessonNotes: number;
  singleClasses: number;
  recurringClasses: number;
  averageLessonRating: number;
  averagePreparednessRating: number;
  averageFocusRating: number;
  averageEffortRating: number;
  skillRatings: Record<string, number>;
  trend: "UP" | "FLAT" | "DOWN";
  teacherSummary: string;
  strengths: string;
  improvementAreas: string;
  recommendedNextFocus: string;
  studentVisibleSummary: string;
};

const students: DemoStudent[] = [
  {
    slug: "isabella",
    email: "isabella@harmonizing.com",
    instrument: "Piano",
    timezone: "America/New_York",
    profile: "strong-piano",
    repertoire: {
      title: "Bésame Mucho",
      composerOrArtist: "Consuelo Velázquez",
      level: "Intermedio inicial",
      status: RepertoireStatus.IMPROVING,
      previousMastery: 72,
      currentMastery: 82,
      focus: "Compases 9-24 con metrónomo y dinámica suave",
      currentTempo: 72,
      targetTempo: 88,
    },
    skillNames: ["Rhythm", "Hand coordination", "Sight reading", "Posture"],
  },
  {
    slug: "luis",
    email: "luis@harmonizing.com",
    instrument: "Voz",
    timezone: "America/Los_Angeles",
    profile: "voice-consistency",
    repertoire: {
      title: "Contigo en la Distancia",
      composerOrArtist: "César Portillo de la Luz",
      level: "Principiante alto",
      status: RepertoireStatus.LEARNING,
      previousMastery: 48,
      currentMastery: 57,
      focus: "Respiración en frases largas y entrada afinada al coro",
    },
    skillNames: ["Pitch accuracy", "Breath control", "Vocal tone", "Performance confidence"],
  },
  {
    slug: "tommy",
    email: "tommy@harmonizing.com",
    instrument: "Piano",
    timezone: "America/New_York",
    profile: "historical-piano",
    repertoire: {
      title: "Para Elisa",
      composerOrArtist: "Ludwig van Beethoven",
      level: "Intermedio",
      status: RepertoireStatus.IMPROVING,
      previousMastery: 64,
      currentMastery: 74,
      focus: "Tema A completo, limpieza de digitación y cierre de frase",
      currentTempo: 78,
      targetTempo: 96,
    },
    skillNames: ["Rhythm", "Timing / metronome", "Scales", "Repertoire/song mastery"],
  },
];

function assertSafeEnvironment() {
  const env = process.env.NODE_ENV;
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const looksProduction = env === "production" || /neon\.tech|render\.com|supabase\.co|railway\.app/i.test(databaseUrl);

  if (looksProduction && !FORCE) {
    throw new Error(
      "Refusing to seed monthly report demo data against a production-like database. Re-run with --force only if you intentionally want demo fixtures there.",
    );
  }
}

function monthKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(date);
}

function monthRange(month: string, timezone: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return {
    startDate: fromZonedTime(`${month}-01T00:00:00.000`, timezone),
    endDate: fromZonedTime(`${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999`, timezone),
  };
}

function previousMonthKey(date: Date, timezone: string) {
  const currentMonth = monthKey(date, timezone);
  const [year, month] = currentMonth.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildReportKey(studentId: string, teacherId: string, startDate: Date, endDate: Date) {
  return `${studentId}:${teacherId}:${startDate.toISOString()}:${endDate.toISOString()}`;
}

async function safeDemoReportKey(reportId: string, canonicalKey: string) {
  const conflictingReport = await prisma.progressReport.findUnique({
    where: { reportKey: canonicalKey },
    select: { id: true, adminNote: true },
  });

  if (!conflictingReport || conflictingReport.id === reportId || conflictingReport.adminNote?.includes(SOURCE)) {
    return canonicalKey;
  }

  return `${canonicalKey}:${SOURCE}`;
}

function scenarioFor(student: DemoStudent, period: "previous" | "current"): ReportScenario {
  const isCurrent = period === "current";

  if (student.profile === "strong-piano") {
    return {
      period,
      status: isCurrent ? ProgressReportStatus.DRAFT : ProgressReportStatus.PUBLISHED,
      grade: isCurrent ? 88 : 91,
      completed: isCurrent ? 3 : 7,
      missed: isCurrent ? 0 : 1,
      cancelled: isCurrent ? 0 : 0,
      totalPracticeMinutes: isCurrent ? 190 : 430,
      practiceLogCount: isCurrent ? 7 : 15,
      assignments: isCurrent ? 4 : 8,
      completedAssignments: isCurrent ? 3 : 7,
      overdueAssignments: 0,
      videos: isCurrent ? 1 : 3,
      reviewedVideos: isCurrent ? 1 : 3,
      lessonNotesCompleted: isCurrent ? 3 : 7,
      missingLessonNotes: 0,
      singleClasses: isCurrent ? 1 : 1,
      recurringClasses: isCurrent ? 2 : 7,
      averageLessonRating: 4.5,
      averagePreparednessRating: 4.4,
      averageFocusRating: 4.6,
      averageEffortRating: 4.8,
      skillRatings: { Rhythm: 4.2, "Hand coordination": 4.4, "Sight reading": 3.6, Posture: 4.7 },
      trend: "UP",
      teacherSummary: "Isabella sostiene un progreso sólido: mejor control rítmico, manos juntas más estables y más intención musical.",
      strengths: "Disciplina de práctica, musicalidad natural y buena respuesta al trabajo por secciones.",
      improvementAreas: "Lectura a primera vista y estabilidad del pulso cuando aumenta la velocidad.",
      recommendedNextFocus: "Subir tempo de forma gradual y cerrar la sección B con metrónomo antes de unir toda la pieza.",
      studentVisibleSummary: "Este mes Isabella avanzó con mucha constancia. La prioridad es mantener tempo estable y unir más secciones sin perder musicalidad.",
    };
  }

  if (student.profile === "voice-consistency") {
    return {
      period,
      status: isCurrent ? ProgressReportStatus.DRAFT : ProgressReportStatus.PUBLISHED,
      grade: isCurrent ? 76 : 79,
      completed: isCurrent ? 2 : 6,
      missed: isCurrent ? 1 : 1,
      cancelled: isCurrent ? 0 : 1,
      totalPracticeMinutes: isCurrent ? 75 : 180,
      practiceLogCount: isCurrent ? 3 : 7,
      assignments: isCurrent ? 4 : 7,
      completedAssignments: isCurrent ? 2 : 4,
      overdueAssignments: isCurrent ? 1 : 1,
      videos: isCurrent ? 1 : 2,
      reviewedVideos: isCurrent ? 0 : 2,
      lessonNotesCompleted: isCurrent ? 2 : 5,
      missingLessonNotes: isCurrent ? 0 : 1,
      singleClasses: isCurrent ? 1 : 1,
      recurringClasses: isCurrent ? 2 : 7,
      averageLessonRating: 3.7,
      averagePreparednessRating: 3.2,
      averageFocusRating: 3.8,
      averageEffortRating: 4.1,
      skillRatings: { "Pitch accuracy": 3.4, "Breath control": 3.1, "Vocal tone": 3.7, "Performance confidence": 3.3 },
      trend: "FLAT",
      teacherSummary: "Luis entiende las indicaciones vocales, pero necesita más constancia entre clases para que la técnica se consolide.",
      strengths: "Buen color vocal, disposición para corregir y mejor confianza al repetir frases cortas.",
      improvementAreas: "Respiración baja constante, afinación en entradas y entrega puntual de tareas.",
      recommendedNextFocus: "Rutina corta diaria de respiración y una grabación semanal del coro a tempo lento.",
      studentVisibleSummary: "Luis tiene buenas condiciones vocales. Si practica pocos minutos cada día, la afinación y el control de aire pueden mejorar rápido.",
    };
  }

  return {
    period,
    status: isCurrent ? ProgressReportStatus.DRAFT : ProgressReportStatus.PUBLISHED,
    grade: isCurrent ? 84 : 87,
    completed: isCurrent ? 3 : 7,
    missed: isCurrent ? 0 : 0,
    cancelled: isCurrent ? 1 : 1,
    totalPracticeMinutes: isCurrent ? 160 : 380,
    practiceLogCount: isCurrent ? 5 : 13,
    assignments: isCurrent ? 4 : 8,
    completedAssignments: isCurrent ? 3 : 6,
    overdueAssignments: 0,
    videos: isCurrent ? 0 : 2,
    reviewedVideos: isCurrent ? 0 : 2,
    lessonNotesCompleted: isCurrent ? 2 : 6,
    missingLessonNotes: isCurrent ? 1 : 1,
    singleClasses: isCurrent ? 1 : 2,
    recurringClasses: isCurrent ? 3 : 6,
    averageLessonRating: 4.2,
    averagePreparednessRating: 4.1,
    averageFocusRating: 4.0,
    averageEffortRating: 4.4,
    skillRatings: { Rhythm: 3.9, "Timing / metronome": 3.7, Scales: 4.1, "Repertoire/song mastery": 4.0 },
    trend: "UP",
    teacherSummary: "Tommy muestra una base histórica sólida y está retomando repertorio con buena memoria musical.",
    strengths: "Reconoce patrones rápidamente, conserva buen oído y responde bien a objetivos semanales claros.",
    improvementAreas: "Regularidad de práctica, digitación limpia y control de tempo al tocar piezas conocidas.",
    recommendedNextFocus: "Documentar práctica semanal y consolidar Para Elisa con manos separadas antes de volver a tempo completo.",
    studentVisibleSummary: "Tommy tiene una base musical fuerte. Este ciclo se enfoca en ordenar hábitos, limpiar digitación y convertir su historial en progreso medible.",
  };
}

function categoryScores(scenario: ReportScenario) {
  const attendanceScore = Math.round((scenario.completed / Math.max(1, scenario.completed + scenario.missed)) * 100);
  const practiceScore = Math.min(100, Math.round((scenario.totalPracticeMinutes / (scenario.period === "current" ? 180 : 420)) * 88));
  const assignmentScore = Math.round((scenario.completedAssignments / Math.max(1, scenario.assignments)) * 100 - scenario.overdueAssignments * 8);
  const skillAverage = average(Object.values(scenario.skillRatings));
  const skillScore = Math.round((skillAverage / 5) * 90 + (scenario.trend === "UP" ? 8 : scenario.trend === "DOWN" ? -5 : 2));
  const repertoireScore = Math.max(70, Math.min(96, scenario.grade - 3));
  const effortScore = Math.round(average([scenario.averagePreparednessRating, scenario.averageFocusRating, scenario.averageEffortRating]) * 20);

  return {
    attendance: score("Asistencia", "Attendance", 0.15, attendanceScore, `${scenario.completed} clases completadas de ${scenario.completed + scenario.missed} no canceladas.`),
    practiceConsistency: score("Constancia de práctica", "Practice consistency", 0.2, practiceScore, `${scenario.totalPracticeMinutes} minutos registrados en ${scenario.practiceLogCount} prácticas.`),
    assignmentCompletion: score("Cumplimiento de tareas", "Assignment completion", 0.2, Math.max(0, assignmentScore), `${scenario.completedAssignments} de ${scenario.assignments} tareas completadas.`),
    skillProgress: score("Progreso de habilidades", "Skill progress", 0.25, Math.max(0, Math.min(100, skillScore)), `Promedio de habilidades ${skillAverage.toFixed(1)}/5.`),
    repertoireProgress: score("Progreso de repertorio", "Repertoire progress", 0.1, repertoireScore, "Repertorio activo con avances por secciones."),
    effortFocus: score("Esfuerzo y enfoque", "Effort and focus", 0.1, effortScore, `Promedio de esfuerzo/enfoque ${average([scenario.averagePreparednessRating, scenario.averageFocusRating, scenario.averageEffortRating]).toFixed(1)}/5.`),
  };
}

function score(esLabel: string, enLabel: string, weight: number, value: number, esExplanation: string) {
  const rounded = Math.round(value);
  return {
    label: { es: esLabel, en: enLabel },
    weight,
    score: rounded,
    weightedScore: Math.round(rounded * weight * 100) / 100,
    explanation: { es: esExplanation, en: esExplanation },
  };
}

function skillSummary(student: DemoStudent, scenario: ReportScenario, skillCategories: Map<string, { id: string; name: string; instrument: string }>) {
  const items = Object.entries(scenario.skillRatings).map(([name, latestAverage], index) => {
    const skill = skillCategories.get(name);
    const delta = scenario.trend === "UP" ? 0.4 + index * 0.05 : scenario.trend === "DOWN" ? -0.35 : 0.05;
    return {
      skillCategoryId: skill?.id ?? name,
      name,
      instrument: skill?.instrument ?? student.instrument.toUpperCase(),
      latestAverage,
      firstAverage: Math.max(1, Math.round((latestAverage - delta) * 10) / 10),
      lastAverage: latestAverage,
      delta: Math.round(delta * 10) / 10,
      trend: scenario.trend,
      ratingCount: scenario.lessonNotesCompleted + scenario.reviewedVideos,
      recentNotes: [`${name}: evidencia demo para reportes mensuales.`],
    };
  });

  const strongest = [...items].sort((a, b) => b.latestAverage - a.latestAverage).slice(0, 2).map((item) => ({ name: item.name, latestAverage: item.latestAverage }));
  const needsPractice = [...items].sort((a, b) => a.latestAverage - b.latestAverage).slice(0, 2).map((item) => ({ name: item.name, latestAverage: item.latestAverage }));
  return { items, strongest, needsPractice, insufficientData: false };
}

async function main() {
  assertSafeEnvironment();

  const now = new Date();
  const [teacherUser, adminUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: TEACHER_EMAIL }, include: { teacherProfile: true } }),
    prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }),
  ]);

  if (!teacherUser?.teacherProfile) throw new Error(`Teacher ${TEACHER_EMAIL} was not found. Run npm run db:seed first.`);
  if (!adminUser) throw new Error(`Admin ${ADMIN_EMAIL} was not found. Run npm run db:seed first.`);

  const teacher = teacherUser as TeacherWithProfile;
  const admin = adminUser as BasicUser;
  const skillRows = await prisma.skillCategory.findMany({ where: { active: true } });
  const skillMap = new Map(skillRows.map((skill) => [skill.name, skill]));

  const results: Array<{ student: string; draftReportId: string; publishedReportId: string }> = [];

  for (const demoStudent of students) {
    const user = await prisma.user.findUnique({
      where: { email: demoStudent.email },
      include: { studentProfile: { include: { assignment: true } } },
    });

    if (!user?.studentProfile) {
      console.warn(`Skipping ${demoStudent.email}; student does not exist. Run npm run db:seed first.`);
      continue;
    }

    const studentUser = user as StudentWithProfile;

    if (studentUser.studentProfile.assignment?.teacherId !== teacher.teacherProfile.id) {
      await prisma.teacherAssignment.upsert({
        where: { studentId: studentUser.studentProfile.id },
        update: { teacherId: teacher.teacherProfile.id },
        create: { studentId: studentUser.studentProfile.id, teacherId: teacher.teacherProfile.id, assignedBy: admin.id },
      });
    }

    const currentMonth = monthKey(now, demoStudent.timezone);
    const previousMonth = previousMonthKey(now, demoStudent.timezone);
    const previous = await seedStudentPeriod({ demoStudent, user: studentUser, teacher, admin, month: previousMonth, period: "previous", skillMap });
    const current = await seedStudentPeriod({ demoStudent, user: studentUser, teacher, admin, month: currentMonth, period: "current", skillMap });
    results.push({ student: studentUser.name, draftReportId: current.reportId, publishedReportId: previous.reportId });
  }

  console.log(JSON.stringify({ source: SOURCE, teacher: TEACHER_EMAIL, createdOrUpdated: results }, null, 2));
}

async function seedStudentPeriod({
  demoStudent,
  user,
  teacher,
  admin,
  month,
  period,
  skillMap,
}: {
  demoStudent: DemoStudent;
  user: StudentWithProfile;
  teacher: TeacherWithProfile;
  admin: BasicUser;
  month: string;
  period: "previous" | "current";
  skillMap: Map<string, { id: string; name: string; instrument: string }>;
}) {
  const studentProfile = user.studentProfile;
  const teacherProfile = teacher.teacherProfile;
  const range = monthRange(month, demoStudent.timezone);
  const scenario = scenarioFor(demoStudent, period);
  const prefix = `${SOURCE}_${demoStudent.slug}_${period}_${month.replace("-", "_")}`;
  const repertoire = await prisma.repertoireItem.upsert({
    where: { id: `${prefix}_repertoire` },
    update: {
      masteryPercent: period === "current" ? demoStudent.repertoire.currentMastery : demoStudent.repertoire.previousMastery,
      status: demoStudent.repertoire.status,
      currentFocusSection: demoStudent.repertoire.focus,
      currentTempo: demoStudent.repertoire.currentTempo,
      targetTempo: demoStudent.repertoire.targetTempo,
      teacherNotes: `${SOURCE}: repertorio usado para visualizar reportes mensuales docentes.`,
      studentVisibleNotes: `Enfoque actual: ${demoStudent.repertoire.focus}.`,
    },
    create: {
      id: `${prefix}_repertoire`,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      title: demoStudent.repertoire.title,
      composerOrArtist: demoStudent.repertoire.composerOrArtist,
      instrument: demoStudent.instrument,
      level: demoStudent.repertoire.level,
      status: demoStudent.repertoire.status,
      startDate: subDays(range.startDate, 20),
      targetDate: addDays(range.endDate, 20),
      masteryPercent: period === "current" ? demoStudent.repertoire.currentMastery : demoStudent.repertoire.previousMastery,
      currentFocusSection: demoStudent.repertoire.focus,
      currentTempo: demoStudent.repertoire.currentTempo,
      targetTempo: demoStudent.repertoire.targetTempo,
      teacherNotes: `${SOURCE}: repertorio usado para visualizar reportes mensuales docentes.`,
      studentVisibleNotes: `Enfoque actual: ${demoStudent.repertoire.focus}.`,
    },
  });

  const completedSessions = await seedSessionsAndLessonNotes({ demoStudent, studentId: studentProfile.id, teacherId: teacherProfile.id, meetingUrl: teacherProfile.zoomLink ?? teacherProfile.meetLink ?? "https://meet.google.com/harmonizing-demo", range, scenario, prefix, skillMap });
  const assignment = await seedAssignmentsAndLogs({ demoStudent, studentId: studentProfile.id, teacherId: teacherProfile.id, repertoireId: repertoire.id, range, scenario, prefix, skillMap, sessionId: completedSessions[0]?.id, lessonNoteId: completedSessions[0]?.lessonNoteId });
  await seedVideos({ demoStudent, studentId: studentProfile.id, teacherId: teacherProfile.id, repertoireId: repertoire.id, assignmentId: assignment.id, range, scenario, prefix, skillMap });

  const startDate = range.startDate;
  const endDate = range.endDate;
  const reportId = `${prefix}_report`;
  const publishedAt = scenario.status === ProgressReportStatus.PUBLISHED ? addHours(range.endDate, 2) : null;
  const skillSummaryJson = skillSummary(demoStudent, scenario, skillMap);
  const categoryScoresJson = categoryScores(scenario);
  const reportKey = await safeDemoReportKey(reportId, buildReportKey(studentProfile.id, teacherProfile.id, startDate, endDate));

  await prisma.progressReport.upsert({
    where: { id: reportId },
    update: {
      reportKey,
      status: scenario.status,
      publishedByUserId: scenario.status === ProgressReportStatus.PUBLISHED ? admin.id : null,
      generatedAt: addHours(range.endDate, 1),
      publishedAt,
      archivedAt: null,
      ...reportMetrics(scenario, demoStudent, repertoire.id, repertoire.title, categoryScoresJson, skillSummaryJson),
    },
    create: {
      id: reportId,
      reportKey,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      generatedByUserId: teacher.id,
      publishedByUserId: scenario.status === ProgressReportStatus.PUBLISHED ? admin.id : null,
      startDate,
      endDate,
      status: scenario.status,
      generatedAt: addHours(range.endDate, 1),
      publishedAt,
      ...reportMetrics(scenario, demoStudent, repertoire.id, repertoire.title, categoryScoresJson, skillSummaryJson),
    },
  });

  if (scenario.status === ProgressReportStatus.PUBLISHED) {
    await prisma.notification.upsert({
      where: { id: `${prefix}_published_notification` },
      update: {
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: "Tu reporte mensual está listo",
        body: `Ya puedes revisar el reporte de ${month}, calificación ${letterGrade(scenario.grade)} y próximo enfoque.`,
        actionUrl: `/progress/reports/${reportId}`,
      },
      create: {
        id: `${prefix}_published_notification`,
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: "Tu reporte mensual está listo",
        body: `Ya puedes revisar el reporte de ${month}, calificación ${letterGrade(scenario.grade)} y próximo enfoque.`,
        actionUrl: `/progress/reports/${reportId}`,
      },
    });
  }

  return { reportId };
}

async function seedSessionsAndLessonNotes({ demoStudent, studentId, teacherId, meetingUrl, range, scenario, prefix, skillMap }: { demoStudent: DemoStudent; studentId: string; teacherId: string; meetingUrl: string; range: { startDate: Date; endDate: Date }; scenario: ReportScenario; prefix: string; skillMap: Map<string, { id: string; name: string; instrument: string }> }) {
  const sessions: Array<{ id: string; lessonNoteId?: string }> = [];
  const total = scenario.completed + scenario.missed + scenario.cancelled;
  const spanDays = Math.max(1, Math.floor((range.endDate.getTime() - range.startDate.getTime()) / 86_400_000));

  for (let index = 0; index < total; index += 1) {
    const status = index < scenario.completed ? SessionStatus.COMPLETED : index < scenario.completed + scenario.missed ? SessionStatus.NO_SHOW : SessionStatus.CANCELLED;
    const startsAtUtc = addHours(addDays(range.startDate, Math.min(spanDays - 1, 3 + index * 4)), 23);
    const endsAtUtc = addHours(startsAtUtc, 1);
    const sessionId = `${prefix}_session_${index + 1}`;

    await prisma.classSession.upsert({
      where: { id: sessionId },
      update: {
        status,
        startsAtUtc,
        endsAtUtc,
        completedAt: status === SessionStatus.COMPLETED ? endsAtUtc : null,
        lessonFocus: `${SOURCE}: ${demoStudent.repertoire.focus}`,
        lastClassNotes: status === SessionStatus.COMPLETED ? scenario.teacherSummary : null,
      },
      create: {
        id: sessionId,
        studentId,
        teacherId,
        type: index % 4 === 0 ? ClassSessionType.SINGLE : ClassSessionType.RECURRING,
        startsAtUtc,
        endsAtUtc,
        meetingUrl,
        status,
        timezone: demoStudent.timezone,
        instrument: demoStudent.instrument,
        lessonFocus: `${SOURCE}: ${demoStudent.repertoire.focus}`,
        lastClassNotes: status === SessionStatus.COMPLETED ? scenario.teacherSummary : null,
        internalNote: `${SOURCE}: generated class evidence for monthly reports.`,
        studentVisibleNote: status === SessionStatus.COMPLETED ? scenario.studentVisibleSummary : null,
        completedAt: status === SessionStatus.COMPLETED ? endsAtUtc : null,
      },
    });

    if (status !== SessionStatus.COMPLETED || index >= scenario.lessonNotesCompleted) {
      sessions.push({ id: sessionId });
      continue;
    }

    const lessonNoteId = `${prefix}_lesson_note_${index + 1}`;
    await prisma.lessonNote.upsert({
      where: { sessionId },
      update: {
        summary: scenario.teacherSummary,
        taughtToday: `Trabajo de ${demoStudent.instrument.toLowerCase()} sobre ${demoStudent.repertoire.focus}.`,
        studentDidWell: scenario.strengths,
        needsImprovement: scenario.improvementAreas,
        homework: scenario.recommendedNextFocus,
        nextLessonFocus: scenario.recommendedNextFocus,
        teacherPrivateNote: `${SOURCE}: nota privada demo para reporte mensual.`,
        studentVisibleNote: scenario.studentVisibleSummary,
        preparednessRating: Math.round(scenario.averagePreparednessRating),
        focusRating: Math.round(scenario.averageFocusRating),
        effortRating: Math.round(scenario.averageEffortRating),
        overallLessonRating: Math.round(scenario.averageLessonRating),
      },
      create: {
        id: lessonNoteId,
        sessionId,
        studentId,
        teacherId,
        summary: scenario.teacherSummary,
        taughtToday: `Trabajo de ${demoStudent.instrument.toLowerCase()} sobre ${demoStudent.repertoire.focus}.`,
        studentDidWell: scenario.strengths,
        needsImprovement: scenario.improvementAreas,
        homework: scenario.recommendedNextFocus,
        nextLessonFocus: scenario.recommendedNextFocus,
        teacherPrivateNote: `${SOURCE}: nota privada demo para reporte mensual.`,
        studentVisibleNote: scenario.studentVisibleSummary,
        preparednessRating: Math.round(scenario.averagePreparednessRating),
        focusRating: Math.round(scenario.averageFocusRating),
        effortRating: Math.round(scenario.averageEffortRating),
        overallLessonRating: Math.round(scenario.averageLessonRating),
      },
    });

    for (const [name, rating] of Object.entries(scenario.skillRatings)) {
      const skill = skillMap.get(name);
      if (!skill) continue;
      await prisma.lessonSkillRating.upsert({
        where: { lessonNoteId_skillCategoryId: { lessonNoteId, skillCategoryId: skill.id } },
        update: { rating: Math.round(rating), note: `${SOURCE}: ${name} calificado para demo mensual.` },
        create: { lessonNoteId, skillCategoryId: skill.id, rating: Math.round(rating), note: `${SOURCE}: ${name} calificado para demo mensual.` },
      });
    }

    sessions.push({ id: sessionId, lessonNoteId });
  }

  return sessions;
}

async function seedAssignmentsAndLogs({ demoStudent, studentId, teacherId, repertoireId, range, scenario, prefix, skillMap, sessionId, lessonNoteId }: { demoStudent: DemoStudent; studentId: string; teacherId: string; repertoireId: string; range: { startDate: Date; endDate: Date }; scenario: ReportScenario; prefix: string; skillMap: Map<string, { id: string; name: string; instrument: string }>; sessionId?: string; lessonNoteId?: string }) {
  const firstSkill = skillMap.get(demoStudent.skillNames[0]);
  let primaryAssignment = null as Awaited<ReturnType<typeof prisma.practiceAssignment.upsert>> | null;

  for (let index = 0; index < scenario.assignments; index += 1) {
    const id = `${prefix}_assignment_${index + 1}`;
    const completed = index < scenario.completedAssignments;
    const overdue = index >= scenario.assignments - scenario.overdueAssignments;
    const assignment = await prisma.practiceAssignment.upsert({
      where: { id },
      update: {
        status: completed ? PracticeAssignmentStatus.REVIEWED : overdue ? PracticeAssignmentStatus.OVERDUE : PracticeAssignmentStatus.ASSIGNED,
        studentCompletionNote: completed ? "Completado como parte del demo de reporte mensual." : null,
        studentCompletedAt: completed ? addDays(range.startDate, 5 + index * 2) : null,
        teacherReviewNote: completed ? "Revisado para demo mensual: buen seguimiento." : null,
      },
      create: {
        id,
        studentId,
        teacherId,
        lessonNoteId: index === 0 ? lessonNoteId : undefined,
        classSessionId: index === 0 ? sessionId : undefined,
        repertoireItemId: repertoireId,
        skillCategoryId: firstSkill?.id,
        title: `${demoStudent.instrument}: práctica mensual ${index + 1}`,
        instructions: `${scenario.recommendedNextFocus} (${SOURCE}).`,
        assignedDate: addDays(range.startDate, 4 + index * 3),
        dueDate: addDays(range.startDate, 8 + index * 3),
        status: completed ? PracticeAssignmentStatus.REVIEWED : overdue ? PracticeAssignmentStatus.OVERDUE : PracticeAssignmentStatus.ASSIGNED,
        expectedMinutes: demoStudent.instrument === "Piano" ? 20 : 15,
        requiresVideo: index === 0 || index === 2,
        teacherReviewNote: completed ? "Revisado para demo mensual: buen seguimiento." : null,
        studentCompletionNote: completed ? "Completado como parte del demo de reporte mensual." : null,
        studentCompletedAt: completed ? addDays(range.startDate, 5 + index * 2) : null,
      },
    });
    if (!primaryAssignment) primaryAssignment = assignment;
  }

  for (let index = 0; index < scenario.practiceLogCount; index += 1) {
    await prisma.practiceLog.upsert({
      where: { id: `${prefix}_practice_log_${index + 1}` },
      update: {
        minutesPracticed: distributeMinutes(scenario.totalPracticeMinutes, scenario.practiceLogCount, index),
        notes: `${SOURCE}: práctica registrada para reportes mensuales.`,
      },
      create: {
        id: `${prefix}_practice_log_${index + 1}`,
        studentId,
        assignmentId: primaryAssignment?.id,
        repertoireItemId: repertoireId,
        skillCategoryId: firstSkill?.id,
        practicedOn: addDays(range.startDate, 2 + index * 2),
        minutesPracticed: distributeMinutes(scenario.totalPracticeMinutes, scenario.practiceLogCount, index),
        notes: `${SOURCE}: práctica registrada para reportes mensuales.`,
        moodRating: scenario.grade >= 85 ? 5 : 4,
        difficultyRating: scenario.grade >= 85 ? 2 : 4,
        parentNote: demoStudent.slug === "tommy" ? "Se retoma historial de práctica con seguimiento familiar." : null,
      },
    });
  }

  return primaryAssignment ?? prisma.practiceAssignment.create({
    data: {
      id: `${prefix}_assignment_fallback`,
      studentId,
      teacherId,
      repertoireItemId: repertoireId,
      skillCategoryId: firstSkill?.id,
      title: `${demoStudent.instrument}: práctica mensual`,
      instructions: scenario.recommendedNextFocus,
      assignedDate: range.startDate,
      status: PracticeAssignmentStatus.ASSIGNED,
      expectedMinutes: 15,
    },
  });
}

async function seedVideos({ demoStudent, studentId, teacherId, repertoireId, assignmentId, range, scenario, prefix, skillMap }: { demoStudent: DemoStudent; studentId: string; teacherId: string; repertoireId: string; assignmentId: string; range: { startDate: Date; endDate: Date }; scenario: ReportScenario; prefix: string; skillMap: Map<string, { id: string; name: string; instrument: string }> }) {
  const firstSkill = skillMap.get(demoStudent.skillNames[0]);

  for (let index = 0; index < scenario.videos; index += 1) {
    const reviewed = index < scenario.reviewedVideos;
    const video = await prisma.practiceVideo.upsert({
      where: { id: `${prefix}_video_${index + 1}` },
      update: {
        status: reviewed ? VideoStatus.REVIEWED : VideoStatus.PENDING,
        reviewedAt: reviewed ? addDays(range.startDate, 12 + index * 3) : null,
      },
      create: {
        id: `${prefix}_video_${index + 1}`,
        studentId,
        teacherId,
        practiceAssignmentId: assignmentId,
        repertoireItemId: repertoireId,
        skillCategoryId: firstSkill?.id,
        storageKey: `${SOURCE}/${demoStudent.slug}/${prefix}-practice-${index + 1}.mp4`,
        originalName: `${demoStudent.slug}-monthly-practice-${index + 1}.mp4`,
        durationSec: demoStudent.instrument === "Piano" ? 118 : 94,
        status: reviewed ? VideoStatus.REVIEWED : VideoStatus.PENDING,
        submittedAt: addDays(range.startDate, 10 + index * 3),
        reviewedAt: reviewed ? addDays(range.startDate, 12 + index * 3) : null,
      },
    });

    if (!reviewed) continue;

    const feedback = await prisma.videoFeedback.upsert({
      where: { id: `${prefix}_video_feedback_${index + 1}` },
      update: { comment: `${SOURCE}: buen material de evidencia para el reporte mensual.`, reviewedAt: addDays(range.startDate, 12 + index * 3) },
      create: { id: `${prefix}_video_feedback_${index + 1}`, videoId: video.id, teacherId, comment: `${SOURCE}: buen material de evidencia para el reporte mensual.`, reviewedAt: addDays(range.startDate, 12 + index * 3) },
    });

    if (firstSkill) {
      await prisma.videoSkillRating.upsert({
        where: { videoFeedbackId_skillCategoryId: { videoFeedbackId: feedback.id, skillCategoryId: firstSkill.id } },
        update: { rating: Math.round(scenario.skillRatings[firstSkill.name] ?? scenario.averageLessonRating), note: `${SOURCE}: evidencia en video.` },
        create: { videoFeedbackId: feedback.id, skillCategoryId: firstSkill.id, rating: Math.round(scenario.skillRatings[firstSkill.name] ?? scenario.averageLessonRating), note: `${SOURCE}: evidencia en video.` },
      });
    }
  }
}

function reportMetrics(scenario: ReportScenario, student: DemoStudent, repertoireId: string, repertoireTitle: string, categoryScoresJson: ReturnType<typeof categoryScores>, skillSummaryJson: ReturnType<typeof skillSummary>) {
  const totalScheduledClasses = scenario.completed + scenario.missed + scenario.cancelled;
  const repertoireMastery = scenario.period === "current" ? student.repertoire.currentMastery : student.repertoire.previousMastery;
  return {
    rubricVersion: "default-v1",
    totalScheduledClasses,
    attendanceCount: scenario.completed + scenario.missed,
    completedLessonsCount: scenario.completed,
    missedLessonsCount: scenario.missed,
    cancelledLessonsCount: scenario.cancelled,
    missedCancelledCount: scenario.missed + scenario.cancelled,
    singleClassesCount: scenario.singleClasses,
    recurringClassesCount: scenario.recurringClasses,
    lessonNotesCompletedCount: scenario.lessonNotesCompleted,
    missingLessonNotesCount: scenario.missingLessonNotes,
    totalPracticeMinutes: scenario.totalPracticeMinutes,
    practiceLogCount: scenario.practiceLogCount,
    practiceAssignmentCount: scenario.assignments,
    completedAssignmentCount: scenario.completedAssignments,
    practiceAssignmentCompletionRate: Math.round((scenario.completedAssignments / Math.max(1, scenario.assignments)) * 100),
    overdueAssignmentCount: scenario.overdueAssignments,
    videoSubmissionsCount: scenario.videos,
    reviewedVideoCount: scenario.reviewedVideos,
    repertoireWorkedCount: 1,
    repertoireCompletedCount: student.repertoire.status === RepertoireStatus.COMPLETED ? 1 : 0,
    averageLessonRating: scenario.averageLessonRating,
    averagePreparednessRating: scenario.averagePreparednessRating,
    averageFocusRating: scenario.averageFocusRating,
    averageEffortRating: scenario.averageEffortRating,
    averageSkillRatings: scenario.skillRatings,
    categoryScores: categoryScoresJson,
    skillSummary: skillSummaryJson,
    attendanceSummary: {
      totalScheduled: totalScheduledClasses,
      completed: scenario.completed,
      missed: scenario.missed,
      cancelled: scenario.cancelled,
      recurring: scenario.recurringClasses,
      single: scenario.singleClasses,
      lessonNotesCompleted: scenario.lessonNotesCompleted,
      missingLessonNotes: scenario.missingLessonNotes,
    },
    practiceSummary: {
      totalMinutes: scenario.totalPracticeMinutes,
      logCount: scenario.practiceLogCount,
      assignmentCount: scenario.assignments,
      completedAssignmentCount: scenario.completedAssignments,
      overdueAssignmentCount: scenario.overdueAssignments,
      completionRate: Math.round((scenario.completedAssignments / Math.max(1, scenario.assignments)) * 100),
      averageMinutesPerWeek: Math.round(scenario.totalPracticeMinutes / (scenario.period === "current" ? 2 : 4)),
    },
    videoSummary: {
      submitted: scenario.videos,
      reviewed: scenario.reviewedVideos,
      pending: Math.max(0, scenario.videos - scenario.reviewedVideos),
      highlights: scenario.reviewedVideos ? [{ comment: `${SOURCE}: feedback incluido en reporte mensual.`, source: SOURCE }] : [],
    },
    repertoireSummary: {
      worked: 1,
      completed: student.repertoire.status === RepertoireStatus.COMPLETED ? 1 : 0,
      averageMasteryPercent: repertoireMastery,
      items: [{ id: repertoireId, title: repertoireTitle, status: student.repertoire.status, masteryPercent: repertoireMastery, focus: student.repertoire.focus }],
    },
    repertoireProgressSummary: {
      activeItems: 1,
      averageMasteryPercent: repertoireMastery,
      byStatus: { [student.repertoire.status]: 1 },
    },
    teacherSummary: scenario.teacherSummary,
    strengths: scenario.strengths,
    improvementAreas: scenario.improvementAreas,
    recommendedNextFocus: scenario.recommendedNextFocus,
    finalGrade: letterGrade(scenario.grade),
    gradeLetter: letterGrade(scenario.grade),
    gradePercentage: scenario.grade,
    adminNote: `${SOURCE}: reporte demo ${scenario.period}.`,
    studentVisibleSummary: scenario.studentVisibleSummary,
  };
}

function distributeMinutes(total: number, count: number, index: number) {
  if (count <= 0) return 0;
  const base = Math.floor(total / count);
  const remainder = total % count;
  return base + (index < remainder ? 1 : 0);
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
