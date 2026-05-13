import Link from "next/link";
import { ProgressReportStatus, Role } from "@prisma/client";

import { GenerateReportForm } from "@/components/progress/report-workflow";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminProgressReportsData } from "@/lib/data";
import { formatDate } from "@/lib/i18n";

export default async function AdminProgressReportsPage({ searchParams }: { searchParams?: Promise<{ month?: string; teacherId?: string; status?: string }> }) {
  const viewer = await requireViewer([Role.ADMIN]);
  const params = await searchParams;
  const data = await getAdminProgressReportsData(viewer, params);
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/progress" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Reportes y calificaciones" : "Reports and grades"}
        title={isSpanish ? "Control mensual del progreso académico." : "Monthly control of academic progress."}
        description={isSpanish ? "Filtra por mes, docente y estado; genera borradores, revisa calificaciones y publica reportes para familias." : "Filter by month, teacher, and status; generate drafts, review grades, and publish reports for families."}
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" action="/admin/progress/reports">
          <input name="month" type="month" defaultValue={data.month} className="h-[3.35rem] rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm" />
          <select name="teacherId" defaultValue={data.teacherId ?? "all"} className="h-[3.35rem] rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm">
            <option value="all">{isSpanish ? "Todos los docentes" : "All teachers"}</option>
            {data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.name}</option>)}
          </select>
          <select name="status" defaultValue={data.status ?? "all"} className="h-[3.35rem] rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm">
            <option value="all">{isSpanish ? "Todos los estados" : "All statuses"}</option>
            <option value="missing">{isSpanish ? "Sin reporte" : "Missing report"}</option>
            <option value={ProgressReportStatus.DRAFT}>{isSpanish ? "Borrador" : "Draft"}</option>
            <option value={ProgressReportStatus.PUBLISHED}>{isSpanish ? "Publicado" : "Published"}</option>
            <option value={ProgressReportStatus.ARCHIVED}>{isSpanish ? "Archivado" : "Archived"}</option>
          </select>
          <Button type="submit" variant="outline">{isSpanish ? "Filtrar" : "Filter"}</Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {data.rows.map((row) => (
          <Card key={row.student.id}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{row.student.user.name}</CardTitle>
                    <CardDescription>{row.teacher?.user.name ?? (isSpanish ? "Sin docente asignado" : "No assigned teacher")} · {formatDate(data.range.startDate, viewer.locale)} - {formatDate(data.range.endDate, viewer.locale)}</CardDescription>
                  </div>
                  <Badge variant={row.report?.status === ProgressReportStatus.PUBLISHED ? "success" : row.report?.status === ProgressReportStatus.ARCHIVED ? "danger" : row.report ? "gold" : "default"}>{row.report ? statusLabel(row.report.status, viewer.locale) : (isSpanish ? "Sin reporte" : "Missing")}</Badge>
                </div>
                {row.report ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm lg:grid-cols-5">
                    <Small label={isSpanish ? "Calificación" : "Grade"} value={row.report.gradeLetter ?? row.report.finalGrade ?? "-"} />
                    <Small label={isSpanish ? "Clases" : "Lessons"} value={`${row.report.completedLessonsCount}/${row.report.totalScheduledClasses}`} />
                    <Small label={isSpanish ? "Práctica" : "Practice"} value={`${row.report.totalPracticeMinutes}m`} />
                    <Small label={isSpanish ? "Tareas" : "Assignments"} value={`${Math.round(row.report.practiceAssignmentCompletionRate)}%`} />
                    <Small label={isSpanish ? "Actualizado" : "Updated"} value={formatDate(row.report.updatedAt, viewer.locale)} />
                  </div>
                ) : <CardDescription className="mt-4">{isSpanish ? "No hay reporte para este estudiante en el período seleccionado." : "No report for this student in the selected period."}</CardDescription>}
              </div>

              <div className="space-y-3">
                {row.report ? <Link href={`/admin/progress/reports/${row.report.id}`}><Button variant="gold" className="w-full">{isSpanish ? "Revisar reporte" : "Review report"}</Button></Link> : null}
                {row.teacher ? <GenerateReportForm studentId={row.student.id} teacherId={row.teacher.id} defaultMonth={data.month} locale={viewer.locale} destination="admin" /> : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3"><p className="font-semibold text-[var(--color-ink)]">{value}</p><p className="text-xs text-[var(--color-ink-soft)]">{label}</p></div>;
}

function statusLabel(status: ProgressReportStatus, locale: "en" | "es") {
  const labels: Record<string, { en: string; es: string }> = {
    DRAFT: { en: "Draft", es: "Borrador" },
    GENERATED: { en: "Generated", es: "Generado" },
    FINALIZED: { en: "Finalized", es: "Finalizado" },
    PUBLISHED: { en: "Published", es: "Publicado" },
    ARCHIVED: { en: "Archived", es: "Archivado" },
  };
  return labels[status]?.[locale] ?? status;
}
