import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { ExamAssessmentDetail } from "@/components/progress/family-learning-cards";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getExamAssessmentForViewer } from "@/lib/data/family-learning";

type PageProps = { params: Promise<{ assessmentId: string }> };

export default async function StudentExamDetailPage({ params }: PageProps) {
  const viewer = await requireViewer([Role.STUDENT]);
  const { assessmentId } = await params;
  const assessment = await getExamAssessmentForViewer(viewer, assessmentId);
  if (!assessment) notFound();
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/exams" userName={viewer.name} locale={viewer.locale}>
      <PageIntro eyebrow={isSpanish ? "Examen publicado" : "Published exam"} title={assessment.title} description={isSpanish ? "Resultado compartido por la docente." : "Result shared by the teacher."} />
      <ExamAssessmentDetail assessment={assessment} locale={viewer.locale} backHref="/exams" />
    </AppShell>
  );
}
