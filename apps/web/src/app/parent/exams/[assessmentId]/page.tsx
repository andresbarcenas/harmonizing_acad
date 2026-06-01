import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { ExamAssessmentDetail } from "@/components/progress/family-learning-cards";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getExamAssessmentForViewer } from "@/lib/data/family-learning";

type PageProps = { params: Promise<{ assessmentId: string }>; searchParams?: Promise<{ studentId?: string }> };

export default async function ParentExamDetailPage({ params, searchParams }: PageProps) {
  const viewer = await requireViewer([Role.PARENT]);
  const [{ assessmentId }, query] = await Promise.all([params, searchParams]);
  const assessment = await getExamAssessmentForViewer(viewer, assessmentId);
  if (!assessment) notFound();
  const isSpanish = viewer.locale === "es";
  const backHref = `/parent/exams${query?.studentId ? `?studentId=${encodeURIComponent(query.studentId)}` : ""}`;

  return (
    <AppShell role={viewer.role} activePath="/parent/exams" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={assessment.studentId}>
      <PageIntro eyebrow={isSpanish ? "Examen publicado" : "Published exam"} title={assessment.title} description={isSpanish ? "Resultado compartido por la docente." : "Result shared by the teacher."} />
      <ExamAssessmentDetail assessment={assessment} locale={viewer.locale} backHref={backHref} />
    </AppShell>
  );
}
