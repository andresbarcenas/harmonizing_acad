import { Role } from "@prisma/client";

import { SkillManager } from "@/components/admin/skill-manager";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminSkillCategories } from "@/lib/skills/admin";

export default async function AdminSkillsPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const skills = await getAdminSkillCategories();
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/skills" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Catálogo académico" : "Academic catalog"}
        title={isSpanish ? "Habilidades" : "Skills"}
        description={isSpanish
          ? "Agrega, edita y desactiva las habilidades que usan docentes, estudiantes y reportes."
          : "Add, edit, and deactivate the skills used by teachers, students, and reports."}
      />
      <SkillManager initialSkills={skills} locale={viewer.locale} />
    </AppShell>
  );
}
