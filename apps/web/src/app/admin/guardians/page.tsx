import { Role } from "@prisma/client";

import { GuardianManager } from "@/components/admin/guardian-manager";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";

export default async function AdminGuardiansPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);

  const [students, guardians] = await Promise.all([
    db.studentProfile.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.parentGuardianProfile.findMany({
      include: {
        user: true,
        students: {
          include: { student: { include: { user: true } } },
          orderBy: [{ primaryContact: "desc" }, { student: { user: { name: "asc" } } }],
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <AppShell role={viewer.role} activePath="/admin/guardians" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.admin.guardianEyebrow}
        title={dictionary.admin.guardianTitle}
        description={dictionary.admin.guardianDescription}
      />

      <Card>
        <CardTitle>{dictionary.admin.guardianManagement}</CardTitle>
        <CardDescription>{dictionary.admin.guardianManagementDescription}</CardDescription>
        <div className="mt-4">
          <GuardianManager
            locale={viewer.locale}
            students={students.map((student) => ({
              id: student.id,
              name: student.user.name,
              email: student.user.email,
            }))}
            guardians={guardians.map((guardian) => ({
              id: guardian.id,
              userId: guardian.userId,
              name: guardian.user.name,
              email: guardian.user.email,
              phone: guardian.phone,
              students: guardian.students.map((link) => ({
                linkId: link.id,
                studentId: link.studentId,
                studentName: link.student.user.name,
                studentEmail: link.student.user.email,
                relationship: link.relationship,
                primaryContact: link.primaryContact,
              })),
            }))}
          />
        </div>
      </Card>
    </AppShell>
  );
}
