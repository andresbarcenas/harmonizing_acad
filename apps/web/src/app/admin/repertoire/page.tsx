import { Role } from "@prisma/client";

import { RepertoireCatalogManager } from "@/components/repertoire/repertoire-catalog-manager";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getRepertoireCatalogManagerData } from "@/lib/data";

export default async function AdminRepertoirePage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getRepertoireCatalogManagerData(viewer, { limit: 80 });
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/repertoire" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Catálogo académico" : "Academy catalog"}
        title={isSpanish ? "Un repertorio central para toda la academia." : "A central repertoire for the whole academy."}
        description={isSpanish ? "Administra canciones, piezas y materiales base; luego asígnalos a cualquier estudiante como progreso individual." : "Manage songs, pieces, and base material; then assign them to any student as individual progress."}
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
