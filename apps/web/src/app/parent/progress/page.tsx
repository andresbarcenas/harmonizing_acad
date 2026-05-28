import Link from "next/link";
import { PracticeAssignmentStatus, RepertoireStatus, Role } from "@prisma/client";

import { AssignmentStatusActions, PracticeLogForm } from "@/components/progress/progress-forms";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentProgressDataForProfile } from "@/lib/data";
import { formatDate, formatDateTimeInZone } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import type { AppLocale } from "@/lib/i18n/locales";
import { resolveParentStudentSelection } from "@/lib/parents";

type ProgressData = Awaited<ReturnType<typeof getStudentProgressDataForProfile>>;
type StudentData = NonNullable<ProgressData["student"]>;
type Assignment = StudentData["practiceAssignments"][number];
type Repertoire = StudentData["repertoireItems"][number];

export default async function ParentProgressPage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const selectedStudentId = selection.selectedStudentId;
  const isSpanish = viewer.locale === "es";

  if (!selectedStudentId) {
    return (
      <AppShell role={viewer.role} activePath="/parent/progress" userName={viewer.name} locale={viewer.locale}>
        <PageIntro eyebrow={isSpanish ? "Progreso familiar" : "Family progress"} title={isSpanish ? "Aún no hay estudiantes vinculados." : "No linked students yet."} description={isSpanish ? "Administración puede vincular estudiantes a esta cuenta familiar." : "An admin can link students to this family account."} />
      </AppShell>
    );
  }

  const data = await getStudentProgressDataForProfile(selectedStudentId);
  const student = data.student;

  return (
    <AppShell role={viewer.role} activePath="/parent/progress" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selectedStudentId}>
      <PageIntro eyebrow={isSpanish ? "Progreso familiar" : "Family progress"} title={isSpanish ? `Práctica y progreso de ${student?.user.name ?? "estudiante"}` : `${student?.user.name ?? "Student"} practice and progress`} description={isSpanish ? "Tareas, canciones, reportes, videos y registro familiar de práctica." : "Assignments, songs, reports, videos, and family practice logging."} />
      {!student ? <Card><CardDescription>{isSpanish ? "No encontramos el perfil." : "Profile not found."}</CardDescription></Card> : <ParentProgressPortal student={student} data={data} studentId={selectedStudentId} locale={viewer.locale} />}
    </AppShell>
  );
}

function ParentProgressPortal({ student, data, studentId, locale }: { student: StudentData; data: ProgressData; studentId: string; locale: AppLocale }) {
  const isSpanish = locale === "es";
  const activeAssignments = student.practiceAssignments.filter((assignment) =>
    assignment.status === PracticeAssignmentStatus.ASSIGNED ||
    assignment.status === PracticeAssignmentStatus.IN_PROGRESS ||
    assignment.status === PracticeAssignmentStatus.OVERDUE,
  );
  const activeRepertoire = student.repertoireItems.filter((item) =>
    item.status !== RepertoireStatus.COMPLETED && item.status !== RepertoireStatus.PAUSED,
  );
  const lastLesson = student.sessions[0] ?? null;
  const latestReport = student.progressReports[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label={isSpanish ? "Próxima clase" : "Next class"} value={data.nextClass ? formatDateTimeInZone(data.nextClass.startsAtUtc, student.user.timezone, locale) : "-"} detail={data.nextClass?.teacher.user.name ?? (isSpanish ? "Sin clase próxima" : "No upcoming class")} />
        <MiniMetric label={isSpanish ? "Minutos esta semana" : "Minutes this week"} value={`${data.practiceMinutesThisWeek}`} detail={isSpanish ? "Registrados por la familia" : "Logged by family"} />
        <MiniMetric label={isSpanish ? "Tareas activas" : "Active assignments"} value={`${activeAssignments.length}`} detail={isSpanish ? "Antes de la próxima clase" : "Before next class"} />
        <MiniMetric label={isSpanish ? "Videos pendientes" : "Pending videos"} value={`${data.pendingVideoAssignments.length}`} detail={isSpanish ? "Solicitados por docente" : "Requested by teacher"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div><CardTitle>{isSpanish ? "Última clase" : "Last lesson"}</CardTitle><CardDescription>{isSpanish ? "Resumen y próximos pasos." : "Summary and next steps."}</CardDescription></div>
              {lastLesson ? <Badge variant="gold">{formatDateTimeInZone(lastLesson.startsAtUtc, student.user.timezone, locale)}</Badge> : null}
            </div>
            {!lastLesson?.lessonNote ? <Empty text={isSpanish ? "Aún no hay notas visibles." : "No visible notes yet."} /> : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label={isSpanish ? "Resumen" : "Summary"} value={lastLesson.lessonNote.summary} />
                <Info label={isSpanish ? "Comentarios generales" : "General comments"} value={lastLesson.lessonNote.studentDidWell} />
                <Info label={isSpanish ? "Próximo enfoque" : "Next focus"} value={lastLesson.lessonNote.nextLessonFocus} />
                <Info label={isSpanish ? "Qué practicamos" : "What we practiced"} value={lastLesson.lessonNote.taughtToday} />
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>{isSpanish ? "Qué practicar" : "What to practice"}</CardTitle>
            <CardDescription>{isSpanish ? "Tareas activas asignadas por la docente." : "Active assignments from the teacher."}</CardDescription>
            <div className="mt-4 space-y-3">
              {activeAssignments.map((assignment) => <AssignmentItem key={assignment.id} assignment={assignment} studentId={studentId} locale={locale} />)}
              {!activeAssignments.length ? <Empty text={isSpanish ? "No hay tareas pendientes." : "No pending assignments."} /> : null}
            </div>
          </Card>

          <Card>
            <CardTitle>{isSpanish ? "Registrar práctica" : "Log practice"}</CardTitle>
            <CardDescription>{isSpanish ? "Registra minutos y notas familiares para alimentar el progreso." : "Log minutes and family notes to support progress."}</CardDescription>
            <div className="mt-4"><PracticeLogForm studentId={studentId} assignments={student.practiceAssignments} repertoire={student.repertoireItems} skills={data.skillCategories} locale={locale} /></div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>{isSpanish ? "Canciones en progreso" : "Songs in progress"}</CardTitle>
            <div className="mt-4 space-y-3">
              {activeRepertoire.map((item) => <RepertoireItem key={item.id} item={item} locale={locale} />)}
              {!activeRepertoire.length ? <Empty text={isSpanish ? "Aún no hay canciones asignadas." : "No songs assigned yet."} /> : null}
            </div>
          </Card>

          <Card>
            <CardTitle>{isSpanish ? "Último reporte" : "Latest report"}</CardTitle>
            {!latestReport ? <Empty text={isSpanish ? "Aún no hay reportes publicados." : "No published reports yet."} /> : (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white/72 p-3 text-sm">
                <p className="font-semibold">{formatDate(latestReport.startDate, locale)} - {formatDate(latestReport.endDate, locale)}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{latestReport.studentVisibleSummary ?? latestReport.teacherSummary ?? (isSpanish ? "Reporte publicado." : "Published report.")}</p>
                <Link href={`/parent/progress/reports/${latestReport.id}`} className="mt-3 inline-flex text-xs font-semibold text-[var(--color-gold-deep)]">{isSpanish ? "Abrir reporte" : "Open report"}</Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AssignmentItem({ assignment, studentId, locale }: { assignment: Assignment; studentId: string; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{assignment.title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">{assignment.instructions}</p>
        </div>
        <Badge variant={assignment.status === PracticeAssignmentStatus.OVERDUE ? "danger" : "gold"}>{assignment.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
        <span className="rounded-full bg-white/82 px-2.5 py-1">{isSpanish ? "Fecha límite" : "Due"}: {assignment.dueDate ? formatDate(assignment.dueDate, locale) : "-"}</span>
        <span className="rounded-full bg-white/82 px-2.5 py-1">{isSpanish ? "Minutos" : "Minutes"}: {assignment.expectedMinutes ?? "-"}</span>
        {assignment.requiresVideo ? <Link href={`/parent/videos?studentId=${studentId}&assignmentId=${assignment.id}`}><Button size="sm" variant="outline">{isSpanish ? "Subir video" : "Upload video"}</Button></Link> : null}
      </div>
      <div className="mt-3"><AssignmentStatusActions assignmentId={assignment.id} status={assignment.status} locale={locale} initialCompletionNote={assignment.studentCompletionNote} /></div>
    </div>
  );
}

function RepertoireItem({ item, locale }: { item: Repertoire; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p><p className="text-xs text-[var(--color-ink-soft)]">{[item.composerOrArtist, instrumentLabel(item.instrument, locale)].filter(Boolean).join(" · ")}</p></div><Badge variant="gold">{item.status}</Badge></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${Math.max(0, Math.min(100, item.masteryPercent))}%` }} /></div>
      <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Dominio" : "Mastery"}: {item.masteryPercent}% · {isSpanish ? "Foco" : "Focus"}: {item.currentFocusSection ?? "-"}</p>
      {item.attachments.length ? <div className="mt-3 flex flex-wrap gap-2">{item.attachments.map((attachment) => <a key={attachment.id} href={`/api/media/repertoire-attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--color-border)] bg-white/84 px-3 py-1 text-xs font-semibold text-[var(--color-gold-deep)]">{isSpanish ? "Partitura" : "Sheet"}: {attachment.originalName}</a>)}</div> : null}
    </div>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-2 font-display text-3xl tracking-[-0.05em] text-[var(--color-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--color-ink-soft)]">{detail}</p></Card>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">{value || "-"}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-3 rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-white/55 p-4 text-sm text-[var(--color-ink-soft)]">{text}</div>;
}
