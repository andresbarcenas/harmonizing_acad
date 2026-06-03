import { Role } from "@prisma/client";

import { SkillManager } from "@/components/admin/skill-manager";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminSkillCategories } from "@/lib/skills/admin";

export default async function TeacherSkillsPage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const skills = await getAdminSkillCategories();
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/skills" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Catálogo académico" : "Academic catalog"}
        title={isSpanish ? "Habilidades" : "Skills"}
        description={isSpanish
          ? "Agrega, edita y desactiva habilidades compartidas que se usan en notas de clase, tareas, videos y reportes."
          : "Add, edit, and deactivate shared skills used in lesson notes, assignments, videos, and reports."}
      />
      <SkillManager initialSkills={skills} locale={viewer.locale} apiBasePath="/api/teacher/skills" canSyncDefaults={false} />
    </AppShell>
  );
}
