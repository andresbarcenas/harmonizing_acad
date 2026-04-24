import Link from "next/link";
import { Role } from "@prisma/client";

import { StudentEditForm } from "@/components/admin/student-edit-form";
import { StudentOnboardingForm } from "@/components/admin/student-onboarding-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function AdminStudentsPage() {
  const viewer = await requireViewer([Role.ADMIN]);

  const [teachers, recentStudents] = await Promise.all([
    db.teacherProfile.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.studentProfile.findMany({
      include: {
        user: true,
        assignment: {
          include: { teacher: { include: { user: true } } },
        },
        subscriptions: {
          where: { active: true },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <AppShell role={viewer.role} activePath="/admin/students" userName={viewer.name}>
      <PageIntro
        eyebrow="Onboarding"
        title="Agregar estudiantes con asignación y plan en un solo flujo."
        description="Crea cuentas de estudiantes, asigna docente y activa el plan estándar sin salir del panel administrativo."
      >
        <Link href="/admin/teachers">
          <Button variant="outline" size="sm">Agregar docente</Button>
        </Link>
      </PageIntro>

      <Card>
        <CardTitle>Nuevo estudiante</CardTitle>
        <CardDescription>
          Este flujo crea la cuenta del estudiante, su perfil, asignación docente y suscripción activa.
        </CardDescription>
        <div className="mt-4">
          {teachers.length ? (
            <StudentOnboardingForm
              teachers={teachers.map((teacher) => ({
                id: teacher.id,
                name: teacher.user.name,
                specialty: teacher.specialty,
              }))}
            />
          ) : (
            <p className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 text-sm text-[var(--color-ink-soft)]">
              No hay docentes disponibles. Crea o activa docentes antes de registrar estudiantes.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Estudiantes recientes</CardTitle>
        <CardDescription>Últimos registros creados en la plataforma.</CardDescription>
        <div className="mt-4 space-y-2">
          {recentStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={student.user.image}
                  alt={student.user.name}
                  fallback={student.user.name.slice(0, 1).toUpperCase()}
                  className="h-10 w-10 text-xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student.user.name}</p>
                  <p className="truncate text-xs text-[var(--color-ink-soft)]">{student.user.email}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Docente: {student.assignment?.teacher.user.name ?? "Sin asignar"}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Plan: {student.subscriptions[0]?.plan.name ?? "Sin plan activo"}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Alta: {new Date(student.joinedAt).toLocaleDateString("es-US")}
                </p>
                <StudentEditForm
                  studentId={student.id}
                  teachers={teachers.map((teacher) => ({
                    id: teacher.id,
                    name: teacher.user.name,
                  }))}
                  initial={{
                    userId: student.user.id,
                    name: student.user.name,
                    email: student.user.email,
                    teacherId: student.assignment?.teacher.id,
                    phone: student.phone,
                    preferredInstrument: student.preferredInstrument,
                    bio: student.bio,
                    profileImage: student.user.image,
                  }}
                />
              </div>
            </div>
          ))}
          {!recentStudents.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">Aún no hay estudiantes registrados.</p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
