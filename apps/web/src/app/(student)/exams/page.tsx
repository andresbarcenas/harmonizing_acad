import { Role } from "@prisma/client";

import { ExamAssessmentList } from "@/components/progress/family-learning-cards";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getPublishedExamAssessmentsForStudent } from "@/lib/data/family-learning";

export default async function StudentExamsPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const isSpanish = viewer.locale === "es";
  const assessments = viewer.studentProfileId ? await getPublishedExamAssessmentsForStudent(viewer.studentProfileId) : null;

  return (
    <AppShell role={viewer.role} activePath="/exams" userName={viewer.name} locale={viewer.locale}>
      <PageIntro eyebrow={isSpanish ? "Exámenes" : "Exams"} title={isSpanish ? "Resultados de exámenes publicados." : "Published exam results."} description={isSpanish ? "Revisa los resultados de piano compartidos por tu docente y descarga el PDF." : "Review piano results shared by your teacher and download the PDF."} />
      {!assessments ? <Card><CardDescription>{isSpanish ? "No encontramos tu perfil." : "We could not find your profile."}</CardDescription></Card> : <ExamAssessmentList assessments={assessments} locale={viewer.locale} basePath="/exams" />}
    </AppShell>
  );
}
