import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressReportStatus, Role } from "@prisma/client";

import { ReportDetail } from "@/components/progress/report-detail";
import { ReportNarrativeForm } from "@/components/progress/report-workflow";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getProgressReportForViewer } from "@/lib/data";

export default async function TeacherReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const viewer = await requireViewer([Role.TEACHER]);
  const { reportId } = await params;
  const report = await getProgressReportForViewer(viewer, reportId);
  if (!report) notFound();
  const isSpanish = viewer.locale === "es";
  const canEdit = report.status === ProgressReportStatus.DRAFT;

  return (
    <AppShell role={viewer.role} activePath="/teacher/progress" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={report.studentId}>
      <PageIntro
        eyebrow={isSpanish ? "Borrador de reporte" : "Report draft"}
        title={isSpanish ? `Reporte de ${report.student.user.name}` : `${report.student.user.name}'s report`}
        description={isSpanish ? "Revisa la calificación calculada y edita el resumen antes de enviarlo a administración." : "Review the calculated grade and edit the summary before admin review."}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ReportDetail report={report} locale={viewer.locale} privateMode />
        <div className="space-y-4">
          <Card>
            <CardTitle>{isSpanish ? "Narrativa editable" : "Editable narrative"}</CardTitle>
            <CardDescription>{canEdit ? (isSpanish ? "Estos textos aparecerán para estudiante/familia cuando administración publique." : "These texts appear to the student/family after admin publishes.") : (isSpanish ? "Este reporte ya no es editable por docente." : "This report is no longer teacher-editable.")}</CardDescription>
            {canEdit ? <div className="mt-4"><ReportNarrativeForm reportId={report.id} locale={viewer.locale} initial={report} /></div> : null}
          </Card>
          <Card>
            <Link href={`/teacher/progress?studentId=${report.studentId}`}><Button variant="outline" className="w-full">{isSpanish ? "Volver al estudiante" : "Back to student"}</Button></Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
