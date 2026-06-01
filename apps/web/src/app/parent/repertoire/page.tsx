import { Role } from "@prisma/client";

import { FamilyRepertoireList } from "@/components/progress/family-learning-cards";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getFamilyRepertoireData } from "@/lib/data/family-learning";
import { resolveParentStudentSelection } from "@/lib/parents";

export default async function ParentRepertoirePage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const isSpanish = viewer.locale === "es";
  const student = selection.selectedStudentId ? await getFamilyRepertoireData(selection.selectedStudentId) : null;

  return (
    <AppShell role={viewer.role} activePath="/parent/repertoire" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selection.selectedStudentId}>
      <PageIntro eyebrow={isSpanish ? "Repertorio familiar" : "Family repertoire"} title={isSpanish ? `Canciones de ${student?.user.name ?? "estudiante"}.` : `${student?.user.name ?? "Student"} songs.`} description={isSpanish ? "Consulta piezas activas, canciones dominadas, notas visibles y partituras." : "Review active pieces, mastered songs, visible notes, and sheets."} />
      {!student ? <Card><CardDescription>{isSpanish ? "No hay estudiantes vinculados." : "No linked students yet."}</CardDescription></Card> : <FamilyRepertoireList items={student.repertoireItems} locale={viewer.locale} />}
    </AppShell>
  );
}
