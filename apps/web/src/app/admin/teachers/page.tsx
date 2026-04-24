import { Role } from "@prisma/client";

import { TeacherEditForm } from "@/components/admin/teacher-edit-form";
import { TeacherOnboardingForm } from "@/components/admin/teacher-onboarding-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function AdminTeachersPage() {
  const viewer = await requireViewer([Role.ADMIN]);

  const recentTeachers = await db.teacherProfile.findMany({
    include: {
      user: true,
      availability: true,
    },
    orderBy: { user: { createdAt: "desc" } },
    take: 12,
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/teachers" userName={viewer.name}>
      <PageIntro
        eyebrow="Onboarding docente"
        title="Agregar docentes con perfil y disponibilidad inicial."
        description="Crea cuentas docentes desde administración y, si quieres, define bloques de horario desde el primer momento."
      />

      <Card>
        <CardTitle>Nuevo docente</CardTitle>
        <CardDescription>
          Este flujo crea credenciales de acceso, perfil docente y disponibilidad opcional.
        </CardDescription>
        <div className="mt-4">
          <TeacherOnboardingForm />
        </div>
      </Card>

      <Card>
        <CardTitle>Docentes recientes</CardTitle>
        <CardDescription>Últimos docentes registrados en la plataforma.</CardDescription>
        <div className="mt-4 space-y-2">
          {recentTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={teacher.user.image}
                  alt={teacher.user.name}
                  fallback={teacher.user.name.slice(0, 1).toUpperCase()}
                  className="h-10 w-10 text-xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{teacher.user.name}</p>
                  <p className="truncate text-xs text-[var(--color-ink-soft)]">{teacher.user.email}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[var(--color-ink-soft)]">{teacher.specialty}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">Zona: {teacher.user.timezone}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Bloques de disponibilidad: {teacher.availability.length}
                </p>
                <TeacherEditForm
                  teacherId={teacher.id}
                  initial={{
                    userId: teacher.user.id,
                    name: teacher.user.name,
                    email: teacher.user.email,
                    specialty: teacher.specialty,
                    bio: teacher.bio,
                    zoomLink: teacher.zoomLink,
                    meetLink: teacher.meetLink,
                    profileImage: teacher.user.image,
                  }}
                />
              </div>
            </div>
          ))}
          {!recentTeachers.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">Aún no hay docentes registrados.</p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
