import { ProgressReportStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";

type JsonRecord = Record<string, unknown>;

type ReportLike = {
  id: string;
  status: ProgressReportStatus;
  startDate: Date;
  endDate: Date;
  gradePercentage: number | null;
  gradeLetter?: string | null;
  finalGrade?: string | null;
  totalScheduledClasses: number;
  completedLessonsCount: number;
  missedLessonsCount?: number;
  cancelledLessonsCount?: number;
  lessonNotesCompletedCount?: number;
  missingLessonNotesCount?: number;
  totalPracticeMinutes: number;
  practiceLogCount?: number;
  practiceAssignmentCount?: number;
  completedAssignmentCount?: number;
  practiceAssignmentCompletionRate: number;
  overdueAssignmentCount?: number;
  videoSubmissionsCount: number;
  reviewedVideoCount?: number;
  repertoireWorkedCount?: number;
  repertoireCompletedCount?: number;
  averageLessonRating?: number | null;
  averagePreparednessRating?: number | null;
  averageFocusRating?: number | null;
  averageEffortRating?: number | null;
  categoryScores?: unknown;
  skillSummary?: unknown;
  attendanceSummary?: unknown;
  practiceSummary?: unknown;
  videoSummary?: unknown;
  repertoireSummary?: unknown;
  teacherSummary?: string | null;
  strengths?: string | null;
  improvementAreas?: string | null;
  recommendedNextFocus?: string | null;
  studentVisibleSummary?: string | null;
  adminNote?: string | null;
};

export function ReportDetail({ report, locale, privateMode = false }: { report: ReportLike; locale: AppLocale; privateMode?: boolean }) {
  const isSpanish = locale === "es";
  const categoryScores = asRecord(report.categoryScores);
  const skillSummary = asRecord(report.skillSummary);
  const skillItems = Array.isArray(skillSummary.items) ? skillSummary.items as Array<JsonRecord> : [];
  const repertoireSummary = asRecord(report.repertoireSummary);
  const repertoireItems = Array.isArray(repertoireSummary.items) ? repertoireSummary.items as Array<JsonRecord> : [];
  const videoSummary = asRecord(report.videoSummary);
  const highlights = Array.isArray(videoSummary.highlights) ? videoSummary.highlights as Array<JsonRecord> : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={isSpanish ? "Calificación" : "Grade"} value={report.gradeLetter ?? report.finalGrade ?? (isSpanish ? "Sin datos" : "Insufficient")} detail={report.gradePercentage === null ? (isSpanish ? "Sin datos suficientes" : "Not enough data") : `${report.gradePercentage}%`} />
        <Metric label={isSpanish ? "Asistencia" : "Attendance"} value={`${report.completedLessonsCount}/${Math.max(1, report.totalScheduledClasses - (report.cancelledLessonsCount ?? 0))}`} detail={isSpanish ? "clases no canceladas" : "non-cancelled lessons"} />
        <Metric label={isSpanish ? "Práctica" : "Practice"} value={`${report.totalPracticeMinutes}`} detail={isSpanish ? "minutos registrados" : "logged minutes"} />
        <Metric label={isSpanish ? "Tareas" : "Assignments"} value={`${Math.round(report.practiceAssignmentCompletionRate)}%`} detail={isSpanish ? "cumplimiento" : "completion"} />
      </div>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{isSpanish ? "Resumen del progreso" : "Progress summary"}</CardTitle>
            <CardDescription>{formatDate(report.startDate, locale)} - {formatDate(report.endDate, locale)}</CardDescription>
          </div>
          <Badge variant={report.status === ProgressReportStatus.PUBLISHED ? "success" : report.status === ProgressReportStatus.ARCHIVED ? "danger" : "gold"}>{statusLabel(report.status, locale)}</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Info label={isSpanish ? "Resumen visible" : "Visible summary"} value={report.studentVisibleSummary ?? report.teacherSummary} />
          <Info label={isSpanish ? "Fortalezas" : "Strengths"} value={report.strengths} />
          <Info label={isSpanish ? "Áreas a mejorar" : "Improvement areas"} value={report.improvementAreas} />
          <Info label={isSpanish ? "Próximo enfoque" : "Next focus"} value={report.recommendedNextFocus} />
          {privateMode ? <Info label={isSpanish ? "Resumen del profesor" : "Teacher summary"} value={report.teacherSummary} /> : null}
          {privateMode && report.adminNote ? <Info label={isSpanish ? "Nota administrativa" : "Admin note"} value={report.adminNote} /> : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>{isSpanish ? "Asistencia" : "Attendance"}</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Small label={isSpanish ? "Programadas" : "Scheduled"} value={report.totalScheduledClasses} />
            <Small label={isSpanish ? "Completadas" : "Completed"} value={report.completedLessonsCount} />
            <Small label={isSpanish ? "Ausencias" : "Missed"} value={report.missedLessonsCount ?? 0} />
            <Small label={isSpanish ? "Canceladas" : "Cancelled"} value={report.cancelledLessonsCount ?? 0} />
            <Small label={isSpanish ? "Notas completas" : "Notes completed"} value={report.lessonNotesCompletedCount ?? 0} />
            <Small label={isSpanish ? "Notas faltantes" : "Missing notes"} value={report.missingLessonNotesCount ?? 0} />
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Práctica, tareas y videos" : "Practice, assignments, and videos"}</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Small label={isSpanish ? "Registros" : "Logs"} value={report.practiceLogCount ?? 0} />
            <Small label={isSpanish ? "Minutos" : "Minutes"} value={report.totalPracticeMinutes} />
            <Small label={isSpanish ? "Tareas" : "Assignments"} value={report.practiceAssignmentCount ?? 0} />
            <Small label={isSpanish ? "Completadas" : "Completed"} value={report.completedAssignmentCount ?? 0} />
            <Small label={isSpanish ? "Videos" : "Videos"} value={report.videoSubmissionsCount} />
            <Small label={isSpanish ? "Revisados" : "Reviewed"} value={report.reviewedVideoCount ?? 0} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardTitle>{isSpanish ? "Calificación por categoría" : "Category grade"}</CardTitle>
          <div className="mt-4 space-y-2">
            {Object.values(categoryScores).map((value, index) => {
              const item = asRecord(value);
              const label = asRecord(item.label);
              const explanation = asRecord(item.explanation);
              return (
                <div key={String(item.key ?? index)} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{String(label[locale] ?? label.en ?? item.key ?? "-")}</p>
                    <Badge>{item.score === null ? (isSpanish ? "Sin datos" : "No data") : `${item.score}%`}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{String(explanation[locale] ?? explanation.en ?? "")}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Habilidades" : "Skills"}</CardTitle>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {skillItems.map((item) => (
              <div key={String(item.skillCategoryId ?? item.name)} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{String(item.name ?? "-")}</p>
                  <Badge variant={item.trend === "UP" ? "success" : item.trend === "DOWN" ? "warning" : "gold"}>{trendLabel(String(item.trend ?? "INSUFFICIENT"), locale)}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{String(item.latestAverage ?? "-")}/5 · {String(item.ratingCount ?? 0)} {isSpanish ? "ratings" : "ratings"}</p>
              </div>
            ))}
            {!skillItems.length ? <CardDescription>{isSpanish ? "Sin datos suficientes de habilidades." : "Not enough skill data."}</CardDescription> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>{isSpanish ? "Canciones trabajadas" : "Songs worked on"}</CardTitle>
          <div className="mt-4 space-y-2">
            {repertoireItems.map((item) => (
              <div key={String(item.id ?? item.title)} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
                <p className="font-semibold">{String(item.title ?? "-")}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{String(item.status ?? "-")} · {String(item.masteryPercent ?? 0)}% · {String(item.focus ?? "-")}</p>
              </div>
            ))}
            {!repertoireItems.length ? <CardDescription>{isSpanish ? "Sin repertorio trabajado en este rango." : "No repertoire worked on in this range."}</CardDescription> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Feedback reciente" : "Recent feedback"}</CardTitle>
          <div className="mt-4 space-y-2">
            {highlights.map((item, index) => <p key={index} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm text-[var(--color-ink-soft)]">{String(item.comment ?? "-")}</p>)}
            {!highlights.length ? <CardDescription>{isSpanish ? "Sin feedback de video en este rango." : "No video feedback in this range."}</CardDescription> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-2 font-display text-3xl tracking-[-0.05em] text-[var(--color-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--color-ink-soft)]">{detail}</p></Card>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/72 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{value || "-"}</p></div>;
}

function Small({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3"><p className="font-display text-2xl">{value}</p><p className="text-xs text-[var(--color-ink-soft)]">{label}</p></div>;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function statusLabel(status: ProgressReportStatus, locale: AppLocale) {
  const labels: Record<string, { en: string; es: string }> = {
    DRAFT: { en: "Draft", es: "Borrador" },
    GENERATED: { en: "Generated", es: "Generado" },
    FINALIZED: { en: "Finalized", es: "Finalizado" },
    PUBLISHED: { en: "Published", es: "Publicado" },
    ARCHIVED: { en: "Archived", es: "Archivado" },
  };
  return labels[status]?.[locale] ?? status;
}

function trendLabel(trend: string, locale: AppLocale) {
  const labels: Record<string, { en: string; es: string }> = {
    UP: { en: "Improving", es: "Mejorando" },
    FLAT: { en: "Stable", es: "Estable" },
    DOWN: { en: "Needs practice", es: "Necesita práctica" },
    INSUFFICIENT: { en: "Not enough data", es: "Sin datos" },
  };
  return labels[trend]?.[locale] ?? trend;
}
