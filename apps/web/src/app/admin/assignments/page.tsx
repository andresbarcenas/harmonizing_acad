import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function AdminAssignmentsPage() {
  const viewer = await requireViewer([Role.ADMIN]);

  const assignments = await db.teacherAssignment.findMany({
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/assignments" userName={viewer.name}>
      <Card>
        <CardTitle>Asignaciones estudiante-docente</CardTitle>
        <CardDescription>Los estudiantes no pueden cambiar docente desde la plataforma.</CardDescription>
        <div className="mt-4 space-y-2">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
              <div>
                <p className="text-sm font-medium">{assignment.student.user.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">Asignado: {new Date(assignment.assignedAt).toLocaleDateString("es-US")}</p>
              </div>
              <p className="text-sm">{assignment.teacher.user.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
