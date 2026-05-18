import { Role } from "@prisma/client";

import { RepertoireCatalogManager } from "@/components/repertoire/repertoire-catalog-manager";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getRepertoireCatalogManagerData } from "@/lib/data";

export default async function TeacherRepertoirePage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const data = await getRepertoireCatalogManagerData(viewer, { limit: 60 });
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/repertoire" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Catálogo de repertorio" : "Repertoire catalog"}
        title={isSpanish ? "Asigna canciones sin esperar al cierre de clase." : "Assign songs without waiting for class completion."}
        description={isSpanish ? "Busca el catálogo compartido de la academia, agrega nuevas canciones y asígnalas a tus estudiantes." : "Search the shared academy catalog, add new songs, and assign them to your students."}
      />
      <RepertoireCatalogManager
        locale={viewer.locale}
        initialItems={data.catalogItems.map(toCatalogItem)}
        students={data.students.map((student) => ({
          id: student.id,
          name: student.user.name,
          instrument: student.preferredInstrument,
          teacherName: student.assignment?.teacher.user.name,
        }))}
      />
    </AppShell>
  );
}

function toCatalogItem(item: Awaited<ReturnType<typeof getRepertoireCatalogManagerData>>["catalogItems"][number]) {
  return {
    id: item.id,
    title: item.title,
    composerOrArtist: item.composerOrArtist,
    instrument: item.instrument,
    level: item.level,
    defaultFocusSection: item.defaultFocusSection,
    defaultCurrentTempo: item.defaultCurrentTempo,
    defaultTargetTempo: item.defaultTargetTempo,
    defaultTeacherNotes: item.defaultTeacherNotes,
    defaultStudentVisibleNotes: item.defaultStudentVisibleNotes,
    tags: item.tags,
  };
}
