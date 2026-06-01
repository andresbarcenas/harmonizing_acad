import Link from "next/link";
import { RepertoireStatus, StudentExamArea } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";
import { instrumentLabel } from "@/lib/instruments";

type RepertoireItem = {
  id: string;
  title: string;
  composerOrArtist: string | null;
  instrument: string | null;
  status: RepertoireStatus;
  masteryPercent: number;
  currentFocusSection: string | null;
  currentTempo: number | null;
  targetTempo: number | null;
  studentVisibleNotes: string | null;
  attachments: Array<{ id: string; originalName: string }>;
  practiceAssignments: Array<{ title: string; status: string }>;
  practiceVideos: Array<{ originalName: string; feedback: Array<{ comment: string }> }>;
};

type ExamAssessment = {
  id: string;
  title: string;
  examDate: Date;
  notes: string | null;
  publishedAt: Date | null;
  teacher: { user: { name: string } };
  repertoireScores: Array<{
    id: string;
    titleSnapshot: string;
    composerSnapshot: string | null;
    interpretationScore: number;
    executionScore: number;
    overallScore: number;
    comments: string | null;
  }>;
  areaScores: Array<{
    id: string;
    area: StudentExamArea;
    topic: string;
    objective: string;
    score: number;
    comments: string | null;
  }>;
};

export function FamilyRepertoireList({ items, locale }: { items: RepertoireItem[]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  const active = items.filter((item) => item.status !== RepertoireStatus.COMPLETED && item.status !== RepertoireStatus.PAUSED);
  const completed = items.filter((item) => item.status === RepertoireStatus.COMPLETED);
  const paused = items.filter((item) => item.status === RepertoireStatus.PAUSED);

  return (
    <div className="space-y-4">
      <RepertoireSection title={isSpanish ? "Activas" : "Active"} description={isSpanish ? "Canciones en aprendizaje o preparación." : "Songs currently assigned or in preparation."} items={active} locale={locale} />
      <RepertoireSection title={isSpanish ? "Completadas" : "Completed"} description={isSpanish ? "Canciones ya dominadas o cerradas." : "Songs already mastered or closed."} items={completed} locale={locale} />
      <RepertoireSection title={isSpanish ? "Pausadas" : "Paused"} description={isSpanish ? "Canciones guardadas para retomar después." : "Songs saved to revisit later."} items={paused} locale={locale} />
    </div>
  );
}

export function ExamAssessmentList({ assessments, locale, basePath, studentId }: { assessments: ExamAssessment[]; locale: AppLocale; basePath: string; studentId?: string | null }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{isSpanish ? "Exámenes publicados" : "Published exams"}</CardTitle>
      <CardDescription>{isSpanish ? "Resultados de exámenes de piano compartidos por la docente." : "Piano exam results shared by the teacher."}</CardDescription>
      <div className="mt-4 grid gap-3">
        {assessments.map((assessment) => {
          const overall = average(assessment.repertoireScores.map((row) => row.overallScore));
          const href = `${basePath}/${assessment.id}${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`;
          return (
            <Link key={assessment.id} href={href} className="block rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-gold)]/45 hover:shadow-[var(--shadow-card-hover)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{assessment.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{formatDate(assessment.examDate, locale)} · {assessment.teacher.user.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{isSpanish ? "Publicado" : "Published"}</Badge>
                  {overall ? <Badge variant="gold">{formatScore(overall)}/10</Badge> : null}
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--color-ink-soft)]">{assessment.repertoireScores.length} {isSpanish ? "canciones" : "songs"} · {assessment.areaScores.filter((row) => row.area === StudentExamArea.HARMONY).length} {isSpanish ? "armonía" : "harmony"} · {assessment.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING).length} {isSpanish ? "lectura" : "reading"}</p>
            </Link>
          );
        })}
        {!assessments.length ? <Empty text={isSpanish ? "Aún no hay exámenes publicados." : "No published exams yet."} /> : null}
      </div>
    </Card>
  );
}

export function ExamAssessmentDetail({ assessment, locale, backHref }: { assessment: ExamAssessment; locale: AppLocale; backHref: string }) {
  const isSpanish = locale === "es";
  const harmony = assessment.areaScores.filter((row) => row.area === StudentExamArea.HARMONY);
  const reading = assessment.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING);
  const repertoireAverage = average(assessment.repertoireScores.map((row) => row.overallScore));
  const harmonyAverage = average(harmony.map((row) => row.score));
  const readingAverage = average(reading.map((row) => row.score));
  const overall = average([repertoireAverage, harmonyAverage, readingAverage].filter((value): value is number => value !== null));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>{formatDate(assessment.examDate, locale)} · {assessment.teacher.user.name}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={backHref}><Button variant="outline" size="sm">{isSpanish ? "Volver" : "Back"}</Button></Link>
            <a href={`/api/progress/exam-assessments/${assessment.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="gold" size="sm">{isSpanish ? "Descargar PDF" : "Download PDF"}</Button></a>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Metric label={isSpanish ? "Repertorio" : "Repertoire"} value={repertoireAverage ? `${formatScore(repertoireAverage)}/10` : "-"} />
          <Metric label={isSpanish ? "Armonía" : "Harmony"} value={harmonyAverage ? `${formatScore(harmonyAverage)}/10` : "-"} />
          <Metric label={isSpanish ? "Lectura" : "Reading"} value={readingAverage ? `${formatScore(readingAverage)}/10` : "-"} />
          <Metric label={isSpanish ? "Total" : "Overall"} value={overall ? `${formatScore(overall)}/10` : "-"} />
        </div>
        {assessment.notes ? <p className="mt-4 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3 text-sm text-[var(--color-ink-soft)]">{assessment.notes}</p> : null}
      </Card>

      <Card>
        <CardTitle>{isSpanish ? "Repertorio" : "Repertoire"}</CardTitle>
        <div className="mt-4 space-y-3">
          {assessment.repertoireScores.map((row) => <ScoreCard key={row.id} title={row.titleSnapshot} subtitle={row.composerSnapshot} scores={[{ label: isSpanish ? "Interpretación" : "Interpretation", value: row.interpretationScore }, { label: isSpanish ? "Ejecución" : "Execution", value: row.executionScore }, { label: isSpanish ? "General" : "Overall", value: row.overallScore }]} comments={row.comments} />)}
        </div>
      </Card>

      <AreaScores title={isSpanish ? "Armonía" : "Harmony"} rows={harmony} locale={locale} />
      <AreaScores title={isSpanish ? "Lectura musical" : "Music reading"} rows={reading} locale={locale} />
    </div>
  );
}

function RepertoireSection({ title, description, items, locale }: { title: string; description: string; items: RepertoireItem[]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{[item.composerOrArtist, instrumentLabel(item.instrument, locale)].filter(Boolean).join(" · ")}</p>
              </div>
              <Badge variant={item.status === RepertoireStatus.COMPLETED ? "success" : item.status === RepertoireStatus.PAUSED ? "default" : "gold"}>{repertoireStatusLabel(item.status, locale)}</Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${Math.max(0, Math.min(100, item.masteryPercent))}%` }} /></div>
            <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Dominio" : "Mastery"}: {item.masteryPercent}% · {isSpanish ? "Foco" : "Focus"}: {item.currentFocusSection ?? "-"}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">Tempo: {item.currentTempo ?? "-"} / {item.targetTempo ?? "-"}</p>
            {item.studentVisibleNotes ? <p className="mt-2 text-xs leading-5 text-[var(--color-ink-soft)]">{item.studentVisibleNotes}</p> : null}
            {item.attachments.length ? <div className="mt-3 flex flex-wrap gap-2">{item.attachments.map((attachment) => <a key={attachment.id} href={`/api/media/repertoire-attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--color-border)] bg-[var(--color-control)] px-3 py-1 text-xs font-semibold text-[var(--color-gold-deep)]">{isSpanish ? "Partitura" : "Sheet"}: {attachment.originalName}</a>)}</div> : null}
            {item.practiceAssignments[0] ? <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Última tarea" : "Latest assignment"}: {item.practiceAssignments[0].title}</p> : null}
            {item.practiceVideos[0]?.feedback[0]?.comment ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Comentario de video" : "Video feedback"}: {item.practiceVideos[0].feedback[0].comment}</p> : null}
          </div>
        ))}
        {!items.length ? <Empty text={isSpanish ? "Nada en esta sección todavía." : "Nothing in this section yet."} /> : null}
      </div>
    </Card>
  );
}

function AreaScores({ title, rows, locale }: { title: string; rows: ExamAssessment["areaScores"]; locale: AppLocale }) {
  const isSpanish = locale === "es";
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="mt-4 space-y-3">
        {rows.map((row) => <ScoreCard key={row.id} title={row.topic} subtitle={row.objective} scores={[{ label: isSpanish ? "Puntaje" : "Score", value: row.score }]} comments={row.comments} />)}
        {!rows.length ? <Empty text={isSpanish ? "Sin filas registradas." : "No rows recorded."} /> : null}
      </div>
    </Card>
  );
}

function ScoreCard({ title, subtitle, scores, comments }: { title: string; subtitle?: string | null; scores: Array<{ label: string; value: number }>; comments?: string | null }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {scores.map((score) => <Badge key={score.label} variant="gold">{score.label}: {formatScore(score.value)}/10</Badge>)}
        </div>
      </div>
      {comments ? <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">{comments}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-control)] p-3"><p className="font-display text-2xl text-[var(--color-ink)]">{value}</p><p className="text-xs text-[var(--color-ink-soft)]">{label}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4 text-sm text-[var(--color-ink-soft)]">{text}</div>;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function repertoireStatusLabel(status: RepertoireStatus, locale: AppLocale) {
  const es: Record<RepertoireStatus, string> = { ASSIGNED: "Asignada", LEARNING: "Aprendiendo", IMPROVING: "Mejorando", PERFORMANCE_READY: "Lista para presentar", COMPLETED: "Completada", PAUSED: "Pausada" };
  const en: Record<RepertoireStatus, string> = { ASSIGNED: "Assigned", LEARNING: "Learning", IMPROVING: "Improving", PERFORMANCE_READY: "Performance ready", COMPLETED: "Completed", PAUSED: "Paused" };
  return (locale === "es" ? es : en)[status];
}
