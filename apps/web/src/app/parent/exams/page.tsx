import { Role } from "@prisma/client";

import { ExamAssessmentList } from "@/components/progress/family-learning-cards";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getPublishedExamAssessmentsForStudent } from "@/lib/data/family-learning";
import { resolveParentStudentSelection } from "@/lib/parents";

export default async function ParentExamsPage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const isSpanish = viewer.locale === "es";
  const assessments = selection.selectedStudentId ? await getPublishedExamAssessmentsForStudent(selection.selectedStudentId) : null;

  return (
    <AppShell role={viewer.role} activePath="/parent/exams" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selection.selectedStudentId}>
      <PageIntro eyebrow={isSpanish ? "Exámenes familiares" : "Family exams"} title={isSpanish ? "Resultados de exámenes publicados." : "Published exam results."} description={isSpanish ? "Revisa los exámenes de piano compartidos por la docente y descarga el PDF." : "Review piano exams shared by the teacher and download the PDF."} />
      {!assessments ? <Card><CardDescription>{isSpanish ? "No hay estudiantes vinculados." : "No linked students yet."}</CardDescription></Card> : <ExamAssessmentList assessments={assessments} locale={viewer.locale} basePath="/parent/exams" studentId={selection.selectedStudentId} />}
    </AppShell>
  );
}
