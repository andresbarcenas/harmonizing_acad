import Link from "next/link";
import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherProgressData } from "@/lib/data";
import { formatDate } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";

type PageProps = { searchParams?: Promise<{ studentId?: string }> };

export default async function TeacherProgressReportsPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const params = await searchParams;
  const data = await getTeacherProgressData(viewer, { studentId: params?.studentId });
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/progress/reports" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.selectedStudentId}>
      <PageIntro
        eyebrow={isSpanish ? "Reportes de progreso" : "Progress reports"}
        title={isSpanish ? "Revisa y genera reportes por estudiante." : "Review and generate student reports."}
        description={isSpanish ? "Encuentra el historial de reportes y abre el generador mensual sin perder el contexto del estudiante." : "Find report history and open the monthly generator without losing student context."}
      />

      {!data.selected ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.students.map((item) => {
            const latestReport = "latestReport" in item ? item.latestReport : null;
            return (
              <Card key={item.assignmentId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={item.student.user.image} alt={item.student.user.name} fallback={item.student.user.name.slice(0, 1)} locale={viewer.locale} />
                    <div className="min-w-0">
                      <CardTitle>{item.student.user.name}</CardTitle>
                      <CardDescription>{instrumentLabel(item.student.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")}</CardDescription>
                    </div>
                  </div>
                  <Link href={`/teacher/progress/reports?studentId=${item.student.id}`}>
                    <Button size="sm" variant="outline">{isSpanish ? "Abrir" : "Open"}</Button>
                  </Link>
                </div>
                <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
                  {latestReport ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{formatDate(latestReport.startDate, viewer.locale)} - {formatDate(latestReport.endDate, viewer.locale)}</p>
                        <Badge>{latestReport.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{latestReport.gradeLetter ?? latestReport.finalGrade ?? (isSpanish ? "Reporte reciente" : "Recent report")}</p>
                    </>
                  ) : (
                    <CardDescription>{isSpanish ? "Aún no hay reportes recientes." : "No recent reports yet."}</CardDescription>
                  )}
                </div>
              </Card>
            );
          })}
          {!data.students.length ? <Card><CardDescription>{isSpanish ? "No tienes estudiantes asignados." : "You do not have assigned students."}</CardDescription></Card> : null}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={data.selected.user.image} alt={data.selected.user.name} fallback={data.selected.user.name.slice(0, 1)} locale={viewer.locale} />
                <div className="min-w-0">
                  <CardTitle>{data.selected.user.name}</CardTitle>
                  <CardDescription>{instrumentLabel(data.selected.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/teacher/progress/reports/new?studentId=${data.selected.id}`}>
                  <Button variant="gold" size="sm">{isSpanish ? "Generar reporte" : "Generate report"}</Button>
                </Link>
                <Link href={`/teacher/progress?studentId=${data.selected.id}`}>
                  <Button variant="outline" size="sm">{isSpanish ? "Volver al progreso" : "Back to progress"}</Button>
                </Link>
                <Link href={`/teacher/progress/exams?studentId=${data.selected.id}`}>
                  <Button variant="outline" size="sm">{isSpanish ? "Evaluaciones" : "Exams"}</Button>
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label={isSpanish ? "Reportes" : "Reports"} value={data.selected.progressReports.length} />
              <Metric label={isSpanish ? "Borradores" : "Drafts"} value={data.selected.progressReports.filter((report) => report.status === "DRAFT").length} />
              <Metric label={isSpanish ? "Publicados" : "Published"} value={data.selected.progressReports.filter((report) => report.status === "PUBLISHED").length} />
              <Metric label={isSpanish ? "Último reporte" : "Latest report"} value={data.selected.progressReports[0] ? formatDate(data.selected.progressReports[0].createdAt, viewer.locale) : "-"} />
            </div>
          </Card>

          <Card>
            <CardTitle>{isSpanish ? "Historial de reportes" : "Report history"}</CardTitle>
            <CardDescription>{isSpanish ? "Abre reportes para revisar borradores o consultar el historial reciente." : "Open reports to review drafts or inspect recent history."}</CardDescription>
            <div className="mt-4 grid gap-3">
              {data.selected.progressReports.map((report) => (
                <Link key={report.id} href={`/teacher/progress/reports/${report.id}`} className="block rounded-xl border border-[var(--color-border)] bg-white/70 p-4 text-sm transition hover:bg-white">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{formatDate(report.startDate, viewer.locale)} - {formatDate(report.endDate, viewer.locale)}</p>
                      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{report.teacherSummary ?? report.studentVisibleSummary ?? (isSpanish ? "Reporte generado." : "Generated report.")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{report.status}</Badge>
                      <span className="text-xs font-semibold text-[var(--color-gold-deep)]">{report.gradeLetter ?? report.finalGrade ?? "-"}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {!data.selected.progressReports.length ? <CardDescription>{isSpanish ? "Aún no hay reportes para este estudiante." : "No reports yet for this student."}</CardDescription> : null}
            </div>
            <div className="mt-4">
              <Link href={`/teacher/progress/reports/new?studentId=${data.selected.id}`}>
                <Button variant="outline" className="w-full">{isSpanish ? "Crear nuevo reporte" : "Create new report"}</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
      <p className="font-display text-2xl">{value}</p>
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}
