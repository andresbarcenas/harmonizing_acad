import Link from "next/link";
import { Role } from "@prisma/client";

import { AssignmentManager } from "@/components/admin/assignment-manager";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";

export default async function AdminAssignmentsPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);

  const assignments = await db.teacherAssignment.findMany({
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
  const teachers = await db.teacherProfile.findMany({
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/assignments" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.shell.nav.assignments}
        title={viewer.locale === "es" ? "Cada relación estudiante-docente, en una vista más limpia." : "Every student-teacher relationship in a cleaner view."}
        description={viewer.locale === "es" ? "Revisa quién acompaña a cada alumno y mantén el control de las asignaciones activas con una lectura rápida y ordenada." : "Review who supports each student and keep active assignments easy to scan."}
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/teachers">
            <Button variant="outline" size="sm">{dictionary.admin.addTeacher}</Button>
          </Link>
          <Link href="/admin/students">
            <Button variant="outline" size="sm">{dictionary.admin.addStudent}</Button>
          </Link>
        </div>
      </PageIntro>

      <Card>
        <CardTitle>{viewer.locale === "es" ? "Asignaciones estudiante-docente" : "Student-teacher assignments"}</CardTitle>
        <CardDescription>{viewer.locale === "es" ? "Los estudiantes no pueden cambiar docente desde la plataforma." : "Students cannot change teachers from the platform."}</CardDescription>
        <div className="mt-4">
          <AssignmentManager
            assignments={assignments.map((assignment) => ({
              id: assignment.id,
              studentId: assignment.studentId,
              studentName: assignment.student.user.name,
              assignedAt: assignment.assignedAt.toISOString(),
              teacherId: assignment.teacherId,
            }))}
            teachers={teachers.map((teacher) => ({
              id: teacher.id,
              name: teacher.user.name,
            }))}
            locale={viewer.locale}
          />
          {!assignments.length ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{viewer.locale === "es" ? "No hay asignaciones activas." : "No active assignments."}</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
