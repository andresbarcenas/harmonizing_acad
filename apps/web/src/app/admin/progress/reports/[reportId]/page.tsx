import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { ReportDetail } from "@/components/progress/report-detail";
import { ReportAdminActions, ReportNarrativeForm } from "@/components/progress/report-workflow";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getProgressReportForViewer } from "@/lib/data";

export default async function AdminReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const viewer = await requireViewer([Role.ADMIN]);
  const { reportId } = await params;
  const report = await getProgressReportForViewer(viewer, reportId);
  if (!report) notFound();
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/progress" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Revisión administrativa" : "Admin review"}
        title={isSpanish ? `Reporte de ${report.student.user.name}` : `${report.student.user.name}'s report`}
        description={isSpanish ? "Revisa cálculos, ajusta narrativa administrativa y publica para estudiante/familia." : "Review calculations, edit admin narrative, and publish to the student/family."}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ReportDetail report={report} locale={viewer.locale} privateMode />
        <div className="space-y-4">
          <Card>
            <CardTitle>{isSpanish ? "Acciones" : "Actions"}</CardTitle>
            <CardDescription>{isSpanish ? "Publicar notifica al estudiante. Archivar oculta el reporte." : "Publishing notifies the student. Archiving hides the report."}</CardDescription>
            <div className="mt-4">
              <ReportAdminActions report={{ id: report.id, studentId: report.studentId, teacherId: report.teacherId, startDate: report.startDate.toISOString(), endDate: report.endDate.toISOString() }} locale={viewer.locale} />
            </div>
          </Card>
          <Card>
            <CardTitle>{isSpanish ? "Narrativa y nota interna" : "Narrative and internal note"}</CardTitle>
            <div className="mt-4">
              <ReportNarrativeForm reportId={report.id} locale={viewer.locale} canEditAdminNote initial={report} />
            </div>
          </Card>
          <Card>
            <Link href="/admin/progress/reports"><Button variant="outline" className="w-full">{isSpanish ? "Volver a reportes" : "Back to reports"}</Button></Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
