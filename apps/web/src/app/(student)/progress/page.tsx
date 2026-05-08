import Link from "next/link";
import { PracticeAssignmentStatus, RepertoireStatus, Role } from "@prisma/client";

import { AssignmentStatusActions, PracticeLogForm } from "@/components/progress/progress-forms";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentProgressData } from "@/lib/data";
import { formatDate, formatDateTimeInZone } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";

type StudentProgressData = NonNullable<Awaited<ReturnType<typeof getStudentProgressData>>["student"]>;
type StudentAssignment = StudentProgressData["practiceAssignments"][number];
type StudentRepertoire = StudentProgressData["repertoireItems"][number];
type StudentSession = StudentProgressData["sessions"][number];

type SkillSnapshot = {
  id: string;
  name: string;
  instrument: string;
  latest: number;
  previous?: number;
  note?: string | null;
};

export default async function StudentProgressPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentProgressData(viewer);
  const isSpanish = viewer.locale === "es";
  const student = data.student;

  return (
    <AppShell role={viewer.role} activePath="/progress" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Portal de progreso" : "Progress portal"}
        title={isSpanish ? "Todo lo que necesitas practicar, claro y en un solo lugar." : "Everything you need to practice, clear and in one place."}
        description={isSpanish ? "Resumen para estudiante y familia: próxima clase, última nota docente, tareas, canciones, videos pendientes y habilidades en progreso." : "A student and family summary: next class, latest teacher note, assignments, songs, pending videos, and skills in progress."}
      />
      {!student ? <Card><CardDescription>{isSpanish ? "No encontramos tu perfil." : "We could not find your profile."}</CardDescription></Card> : <StudentProgressPortal student={student} data={data} locale={viewer.locale} />}
    </AppShell>
  );
}

function StudentProgressPortal({ student, data, locale }: { student: StudentProgressData; data: Awaited<ReturnType<typeof getStudentProgressData>>; locale: AppLocale }) {
  const isSpanish = locale === "es";
  const lastLesson = student.sessions[0] ?? null;
  const activeAssignmentStatuses: PracticeAssignmentStatus[] = [PracticeAssignmentStatus.ASSIGNED, PracticeAssignmentStatus.IN_PROGRESS, PracticeAssignmentStatus.OVERDUE];
  const completedAssignmentStatuses: PracticeAssignmentStatus[] = [PracticeAssignmentStatus.COMPLETED, PracticeAssignmentStatus.REVIEWED];
  const inactiveRepertoireStatuses: RepertoireStatus[] = [RepertoireStatus.COMPLETED, RepertoireStatus.PAUSED];
  const activeAssignments = student.practiceAssignments.filter((assignment) => activeAssignmentStatuses.includes(assignment.status));
  const completedAssignments = student.practiceAssignments.filter((assignment) => completedAssignmentStatuses.includes(assignment.status));
  const activeRepertoire = student.repertoireItems.filter((item) => !inactiveRepertoireStatuses.includes(item.status));
  const recentFeedback = student.practiceVideos.flatMap((video) => video.feedback.map((feedback) => ({ video, feedback }))).slice(0, 3);
  const skillSnapshot = buildSkillSnapshot(student).slice(0, 8);
  const latestReport = student.progressReports[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={isSpanish ? "Próxima clase" : "Next class"} value={data.nextClass ? formatDateTimeInZone(data.nextClass.startsAtUtc, student.user.timezone, locale) : "-"} detail={data.nextClass?.teacher.user.name ?? (isSpanish ? "Sin clase próxima" : "No upcoming class")} />
        <MetricCard label={isSpanish ? "Minutos esta semana" : "Minutes this week"} value={`${data.practiceMinutesThisWeek}`} detail={isSpanish ? "Registrados por estudiante/familia" : "Logged by student/family"} />
        <MetricCard label={isSpanish ? "Tareas activas" : "Active assignments"} value={`${activeAssignments.length}`} detail={isSpanish ? "Antes de la próxima clase" : "Before the next class"} />
        <MetricCard label={isSpanish ? "Videos pendientes" : "Pending videos"} value={`${data.pendingVideoAssignments.length}`} detail={isSpanish ? "Solicitados por tu docente" : "Requested by your teacher"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <LastLessonCard session={lastLesson} studentTimezone={student.user.timezone} locale={locale} />
          <AssignmentsCard assignments={activeAssignments} completedAssignments={completedAssignments} locale={locale} />
          <PracticeLogCard student={student} skillCategories={data.skillCategories} locale={locale} />
        </div>
        <div className="space-y-4">
          <RepertoireCard items={activeRepertoire} locale={locale} />
          <SkillSnapshotCard skills={skillSnapshot} locale={locale} />
          <TeacherFeedbackCard feedback={recentFeedback} locale={locale} />
          <ProgressReportCard report={latestReport} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function LastLessonCard({ session, studentTimezone, locale }: { session: StudentSession | null; studentTimezone: string; locale: AppLocale }) {
  const isSpanish = locale === "es";
  const note = session?.lessonNote;
  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{isSpanish ? "Última clase" : "Last lesson"}</CardTitle>
          <CardDescription>{isSpanish ? "Lo que pasó en la clase y qué sigue." : "What happened in class and what comes next."}</CardDescription>
        </div>
        {session ? <Badge variant="gold">{formatDateTimeInZone(session.startsAtUtc, studentTimezone, locale)}</Badge> : null}
      </div>
      {!note ? <EmptyState text={isSpanish ? "Aún no hay notas visibles de clase." : "No visible lesson notes yet."} /> : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InfoBlock label={isSpanish ? "Resumen de la clase" : "Lesson summary"} value={note.summary} />
          <InfoBlock label={isSpanish ? "Qué practicamos" : "What we practiced"} value={note.taughtToday} />
          <InfoBlock label={isSpanish ? "Lo que hizo bien" : "What went well"} value={note.studentDidWell} />
          <InfoBlock label={isSpanish ? "Áreas que necesitan práctica" : "Areas that need practice"} value={note.needsImprovement} />
          <InfoBlock label={isSpanish ? "Enfoque para la próxima clase" : "Next lesson focus"} value={note.nextLessonFocus} />
          <InfoBlock label={isSpanish ? "Nota visible del profesor" : "Teacher visible note"} value={note.studentVisibleNote} />
        </div>
      )}
    </Card>
  );
}

function AssignmentsCard({ assignments, completedAssignments, locale }: { assignments: StudentAssignment[]; completedAssignments: StudentAssignment[]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{isSpanish ? "Qué debe practicar antes de la próxima clase" : "What to practice before the next class"}</CardTitle>
      <CardDescription>{isSpanish ? "Tareas asignadas por tu docente, con fechas y videos requeridos." : "Teacher-assigned work with due dates and requested videos."}</CardDescription>
      <div className="mt-4 space-y-3">
        {assignments.map((assignment) => <AssignmentItem key={assignment.id} assignment={assignment} locale={locale} />)}
        {!assignments.length ? <EmptyState text={isSpanish ? "No tienes tareas pendientes. Cuando tu docente asigne práctica, aparecerá aquí." : "No pending assignments. Teacher-assigned practice will appear here."} /> : null}
      </div>
      {completedAssignments.length ? (
        <details className="mt-4 rounded-[1.2rem] border border-[var(--color-border)] bg-white/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">{isSpanish ? "Tareas completadas" : "Completed assignments"} ({completedAssignments.length})</summary>
          <div className="mt-3 space-y-2">
            {completedAssignments.slice(0, 5).map((assignment) => <AssignmentItem key={assignment.id} assignment={assignment} locale={locale} compact />)}
          </div>
        </details>
      ) : null}
    </Card>
  );
}

function AssignmentItem({ assignment, locale, compact = false }: { assignment: StudentAssignment; locale: AppLocale; compact?: boolean }) {
  const isSpanish = locale === "es";
  const videoHref = buildVideoHref(assignment);
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{assignment.title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">{assignment.instructions}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            {[assignment.repertoireItem?.title, assignment.skillCategory?.name].filter(Boolean).join(" · ") || (isSpanish ? "Práctica general" : "General practice")}
          </p>
        </div>
        <Badge variant={assignment.status === PracticeAssignmentStatus.COMPLETED || assignment.status === PracticeAssignmentStatus.REVIEWED ? "success" : assignment.status === PracticeAssignmentStatus.OVERDUE ? "danger" : "gold"}>{assignmentStatusLabel(assignment.status, locale)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
        <span className="rounded-full bg-white/82 px-2.5 py-1">{isSpanish ? "Fecha límite" : "Due"}: {assignment.dueDate ? formatDate(assignment.dueDate, locale) : "-"}</span>
        <span className="rounded-full bg-white/82 px-2.5 py-1">{isSpanish ? "Minutos" : "Minutes"}: {assignment.expectedMinutes ?? "-"}</span>
        {assignment.requiresVideo ? <span className="rounded-full bg-[var(--color-gold-soft)] px-2.5 py-1 font-semibold text-[var(--color-gold-deep)]">{isSpanish ? "Video requerido" : "Video required"}</span> : null}
      </div>
      {assignment.studentCompletionNote ? <p className="mt-2 rounded-xl bg-white/76 px-3 py-2 text-xs text-[var(--color-ink-soft)]">{assignment.studentCompletionNote}</p> : null}
      {!compact ? (
        <div className="mt-3 space-y-2">
          <AssignmentStatusActions assignmentId={assignment.id} status={assignment.status} locale={locale} initialCompletionNote={assignment.studentCompletionNote} />
          {assignment.requiresVideo ? <Link href={videoHref}><Button size="sm" variant="outline">{isSpanish ? "Subir video de práctica" : "Upload practice video"}</Button></Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function PracticeLogCard({ student, skillCategories, locale }: { student: StudentProgressData; skillCategories: Awaited<ReturnType<typeof getStudentProgressData>>["skillCategories"]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{isSpanish ? "Registrar práctica" : "Log practice"}</CardTitle>
      <CardDescription>{isSpanish ? "Suma minutos, notas y contexto familiar. Esto alimenta tu progreso semanal." : "Add minutes, notes, and family context. This powers your weekly progress."}</CardDescription>
      <div className="mt-4">
        <PracticeLogForm assignments={student.practiceAssignments} repertoire={student.repertoireItems} skills={skillCategories} locale={locale} />
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{isSpanish ? "Actividad reciente" : "Recent activity"}</p>
        {student.practiceLogs.slice(0, 4).map((log) => (
          <div key={log.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
            <p className="font-semibold">{log.minutesPracticed} min · {formatDate(log.practicedOn, locale)}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">{log.notes ?? log.assignment?.title ?? log.repertoireItem?.title ?? "-"}</p>
          </div>
        ))}
        {!student.practiceLogs.length ? <EmptyState text={isSpanish ? "Aún no hay registros de práctica." : "No practice logs yet."} /> : null}
      </div>
    </Card>
  );
}

function RepertoireCard({ items, locale }: { items: StudentRepertoire[]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{isSpanish ? "Canciones en progreso" : "Songs in progress"}</CardTitle>
      <CardDescription>{isSpanish ? "Piezas, canciones y focos actuales indicados por tu docente." : "Pieces, songs, and current focus areas from your teacher."}</CardDescription>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const latestFeedback = item.practiceVideos[0]?.feedback[0] ?? null;
          const latestAssignment = item.practiceAssignments[0] ?? null;
          return (
            <div key={item.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{item.composerOrArtist ?? ""} · {item.instrument}</p>
                </div>
                <Badge variant="gold">{repertoireStatusLabel(item.status, locale)}</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${Math.max(0, Math.min(100, item.masteryPercent))}%` }} />
              </div>
              <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Dominio" : "Mastery"}: {item.masteryPercent}% · {isSpanish ? "Foco" : "Focus"}: {item.currentFocusSection ?? "-"}</p>
              <p className="text-xs text-[var(--color-ink-soft)]">Tempo: {item.currentTempo ?? "-"} / {item.targetTempo ?? "-"}</p>
              {item.studentVisibleNotes ? <p className="mt-2 text-xs leading-5 text-[var(--color-ink-soft)]">{item.studentVisibleNotes}</p> : null}
              {latestAssignment ? <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Última tarea" : "Latest assignment"}: {latestAssignment.title}</p> : null}
              {latestFeedback ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Feedback de video" : "Video feedback"}: {latestFeedback.comment}</p> : null}
            </div>
          );
        })}
        {!items.length ? <EmptyState text={isSpanish ? "Aún no hay canciones asignadas." : "No songs assigned yet."} /> : null}
      </div>
    </Card>
  );
}

function SkillSnapshotCard({ skills, locale }: { skills: SkillSnapshot[]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  const strong = skills.filter((skill) => skill.latest >= 4);
  const needsPractice = skills.filter((skill) => skill.latest <= 2);
  return (
    <Card>
      <CardTitle>{isSpanish ? "Habilidades en progreso" : "Skill progress"}</CardTitle>
      <CardDescription>{isSpanish ? "Últimas calificaciones visibles por habilidad." : "Latest visible ratings by skill."}</CardDescription>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {skills.map((skill) => (
          <div key={skill.id} className="rounded-xl border border-[var(--color-border)] bg-white/72 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{skill.name}</p>
              <Badge variant={skill.latest >= 4 ? "success" : skill.latest <= 2 ? "warning" : "gold"}>{skillLabel(skill.latest, locale)}</Badge>
            </div>
            <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{skill.instrument} · {skill.latest}/5 {skill.previous ? trendLabel(skill.latest, skill.previous, locale) : ""}</p>
            {skill.note ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{skill.note}</p> : null}
          </div>
        ))}
      </div>
      {!skills.length ? <EmptyState text={isSpanish ? "Aún no hay calificaciones de habilidades." : "No skill ratings yet."} /> : null}
      {skills.length ? <p className="mt-3 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Áreas fuertes" : "Strong areas"}: {strong.map((skill) => skill.name).join(", ") || "-"} · {isSpanish ? "Necesitan práctica" : "Need practice"}: {needsPractice.map((skill) => skill.name).join(", ") || "-"}</p> : null}
    </Card>
  );
}

function TeacherFeedbackCard({ feedback, locale }: { feedback: Array<{ video: StudentProgressData["practiceVideos"][number]; feedback: StudentProgressData["practiceVideos"][number]["feedback"][number] }>; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{isSpanish ? "Feedback reciente" : "Recent feedback"}</CardTitle>
      <CardDescription>{isSpanish ? "Comentarios de tu docente sobre videos de práctica." : "Teacher comments on practice videos."}</CardDescription>
      <div className="mt-4 space-y-2">
        {feedback.map(({ video, feedback: item }) => (
          <div key={item.id} className="rounded-xl border border-[var(--color-border)] bg-white/72 p-3 text-sm">
            <p className="font-semibold">{video.practiceAssignment?.title ?? video.repertoireItem?.title ?? video.originalName}</p>
            <p className="text-xs leading-5 text-[var(--color-ink-soft)]">{item.comment}</p>
          </div>
        ))}
        {!feedback.length ? <EmptyState text={isSpanish ? "Aún no hay feedback reciente." : "No recent feedback yet."} /> : null}
      </div>
    </Card>
  );
}

function ProgressReportCard({ report, locale }: { report: StudentProgressData["progressReports"][number] | null; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{isSpanish ? "Último reporte" : "Latest report"}</CardTitle>
      {!report ? <EmptyState text={isSpanish ? "Aún no hay reportes generados." : "No reports yet."} /> : (
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white/72 p-3 text-sm">
          <p className="font-semibold">{formatDate(report.startDate, locale)} - {formatDate(report.endDate, locale)}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{report.teacherSummary ?? (isSpanish ? "Reporte generado por tu docente." : "Report generated by your teacher.")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-ink-soft)]">
            <span>{isSpanish ? "Clases" : "Lessons"}: {report.completedLessonsCount}</span>
            <span>{isSpanish ? "Práctica" : "Practice"}: {report.totalPracticeMinutes} min</span>
            <span>{isSpanish ? "Videos" : "Videos"}: {report.videoSubmissionsCount}</span>
            <span>{isSpanish ? "Promedio" : "Average"}: {report.averageLessonRating ? report.averageLessonRating.toFixed(1) : "-"}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-2 font-display text-3xl tracking-[-0.05em] text-[var(--color-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--color-ink-soft)]">{detail}</p></Card>;
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">{value || "-"}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="mt-3 rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-white/55 p-4 text-sm text-[var(--color-ink-soft)]">{text}</div>;
}

function buildSkillSnapshot(student: StudentProgressData): SkillSnapshot[] {
  const buckets = new Map<string, SkillSnapshot & { values: number[] }>();
  const lessonRatings = student.sessions.flatMap((session) => session.lessonNote?.skillRatings ?? []);
  const videoRatings = student.practiceVideos.flatMap((video) => video.feedback.flatMap((feedback) => feedback.skillRatings));

  for (const rating of [...lessonRatings, ...videoRatings]) {
    const existing = buckets.get(rating.skillCategoryId);
    if (!existing) {
      buckets.set(rating.skillCategoryId, {
        id: rating.skillCategoryId,
        name: rating.skillCategory.name,
        instrument: rating.skillCategory.instrument,
        latest: rating.rating,
        previous: undefined,
        note: rating.note,
        values: [rating.rating],
      });
    } else {
      existing.values.push(rating.rating);
      existing.previous = existing.values[1];
    }
  }

  return Array.from(buckets.values()).map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    instrument: bucket.instrument,
    latest: bucket.latest,
    previous: bucket.previous,
    note: bucket.note,
  })).sort((a, b) => a.latest - b.latest);
}

function buildVideoHref(assignment: StudentAssignment) {
  const params = new URLSearchParams({ assignmentId: assignment.id });
  if (assignment.repertoireItemId) params.set("repertoireItemId", assignment.repertoireItemId);
  if (assignment.skillCategoryId) params.set("skillCategoryId", assignment.skillCategoryId);
  return `/videos?${params.toString()}`;
}

function assignmentStatusLabel(status: PracticeAssignmentStatus, locale: AppLocale) {
  const es: Record<PracticeAssignmentStatus, string> = { ASSIGNED: "Asignada", IN_PROGRESS: "En progreso", COMPLETED: "Completada", REVIEWED: "Revisada", OVERDUE: "Vencida" };
  const en: Record<PracticeAssignmentStatus, string> = { ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed", REVIEWED: "Reviewed", OVERDUE: "Overdue" };
  return locale === "es" ? es[status] : en[status];
}

function repertoireStatusLabel(status: RepertoireStatus, locale: AppLocale) {
  const es: Record<RepertoireStatus, string> = { ASSIGNED: "Asignada", LEARNING: "Aprendiendo", IMPROVING: "Mejorando", PERFORMANCE_READY: "Lista para presentar", COMPLETED: "Completada", PAUSED: "Pausada" };
  const en: Record<RepertoireStatus, string> = { ASSIGNED: "Assigned", LEARNING: "Learning", IMPROVING: "Improving", PERFORMANCE_READY: "Performance ready", COMPLETED: "Completed", PAUSED: "Paused" };
  return locale === "es" ? es[status] : en[status];
}

function skillLabel(rating: number, locale: AppLocale) {
  if (rating >= 4) return locale === "es" ? "Fuerte" : "Strong";
  if (rating <= 2) return locale === "es" ? "Necesita práctica" : "Needs practice";
  return locale === "es" ? "Mejorando" : "Improving";
}

function trendLabel(latest: number, previous: number, locale: AppLocale) {
  if (latest > previous) return locale === "es" ? "· subiendo" : "· improving";
  if (latest < previous) return locale === "es" ? "· requiere atención" : "· needs attention";
  return locale === "es" ? "· estable" : "· steady";
}
