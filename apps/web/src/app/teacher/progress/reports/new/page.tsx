import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { GenerateReportForm } from "@/components/progress/report-workflow";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherReportGenerationData } from "@/lib/data";

export default async function TeacherNewReportPage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.TEACHER]);
  const params = await searchParams;
  const data = await getTeacherReportGenerationData(viewer, params?.studentId);
  if (!data.student) notFound();
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/progress" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.student.id}>
      <PageIntro
        eyebrow={isSpanish ? "Reporte mensual" : "Monthly report"}
        title={isSpanish ? "Genera un borrador con datos reales del progreso." : "Generate a draft from real progress data."}
        description={isSpanish ? "El sistema calcula métricas y calificación; tú revisas y editas el lenguaje antes de que administración publique." : "The system calculates metrics and grade; you review the language before admin publishes."}
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="flex items-center gap-3">
            <Avatar src={data.student.user.image} alt={data.student.user.name} fallback={data.student.user.name.slice(0, 1)} />
            <div>
              <CardTitle>{data.student.user.name}</CardTitle>
              <CardDescription>{data.student.preferredInstrument ?? (isSpanish ? "Música" : "Music")}</CardDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/teacher/progress?studentId=${data.student.id}`}><Button variant="outline" size="sm">{isSpanish ? "Volver al progreso" : "Back to progress"}</Button></Link>
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{isSpanish ? "Reportes recientes" : "Recent reports"}</p>
            {data.reports.map((report) => (
              <Link key={report.id} href={`/teacher/progress/reports/${report.id}`} className="block rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm transition hover:bg-white">
                <span className="font-semibold">{report.gradeLetter ?? report.finalGrade ?? report.status}</span>
                <span className="block text-xs text-[var(--color-ink-soft)]">{report.status}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Generar borrador" : "Generate draft"}</CardTitle>
          <CardDescription>{isSpanish ? "Usa un mes completo o define un rango personalizado." : "Use a full month or define a custom date range."}</CardDescription>
          <div className="mt-4">
            <GenerateReportForm studentId={data.student.id} teacherId={viewer.teacherProfileId} defaultMonth={data.month} locale={viewer.locale} destination="teacher" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
