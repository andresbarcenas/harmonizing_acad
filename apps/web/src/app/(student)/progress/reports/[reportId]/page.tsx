import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { ReportDetail } from "@/components/progress/report-detail";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getProgressReportForViewer } from "@/lib/data";

export default async function StudentReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const viewer = await requireViewer([Role.STUDENT]);
  const { reportId } = await params;
  const report = await getProgressReportForViewer(viewer, reportId);
  if (!report) notFound();
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/progress" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Reporte mensual" : "Monthly report"}
        title={isSpanish ? "Tu resumen de progreso está listo." : "Your progress summary is ready."}
        description={isSpanish ? "Revisa asistencia, práctica, tareas, videos, canciones trabajadas, calificación y próximo enfoque." : "Review attendance, practice, assignments, videos, songs, grade, and next focus."}
      />
      <div className="mb-4">
        <Link href="/progress"><Button variant="outline">{isSpanish ? "Volver al progreso" : "Back to progress"}</Button></Link>
      </div>
      <ReportDetail report={report} locale={viewer.locale} />
    </AppShell>
  );
}
