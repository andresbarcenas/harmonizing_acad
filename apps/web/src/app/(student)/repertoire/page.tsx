import { Role } from "@prisma/client";

import { FamilyRepertoireList } from "@/components/progress/family-learning-cards";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getFamilyRepertoireData } from "@/lib/data/family-learning";

export default async function StudentRepertoirePage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const isSpanish = viewer.locale === "es";
  const student = viewer.studentProfileId ? await getFamilyRepertoireData(viewer.studentProfileId) : null;

  return (
    <AppShell role={viewer.role} activePath="/repertoire" userName={viewer.name} locale={viewer.locale}>
      <PageIntro eyebrow={isSpanish ? "Repertorio" : "Repertoire"} title={isSpanish ? "Tus canciones asignadas y completadas." : "Your assigned and completed songs."} description={isSpanish ? "Consulta piezas activas, canciones dominadas, notas visibles y partituras compartidas por tu docente." : "Review active pieces, mastered songs, visible notes, and sheets shared by your teacher."} />
      {!student ? <Card><CardDescription>{isSpanish ? "No encontramos tu perfil." : "We could not find your profile."}</CardDescription></Card> : <FamilyRepertoireList items={student.repertoireItems} locale={viewer.locale} />}
    </AppShell>
  );
}
