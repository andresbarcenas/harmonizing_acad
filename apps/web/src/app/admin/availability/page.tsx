import Link from "next/link";
import { Role } from "@prisma/client";

import { AvailabilityManager } from "@/components/admin/availability-manager";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function AdminAvailabilityPage() {
  const viewer = await requireViewer([Role.ADMIN]);

  const teachers = await db.teacherProfile.findMany({
    include: {
      user: true,
      availability: { orderBy: [{ weekday: "asc" }, { startMinuteLocal: "asc" }] },
    },
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/availability" userName={viewer.name}>
      <PageIntro
        eyebrow="Disponibilidad"
        title="Horarios docentes con una vista más tranquila."
        description="Consulta las franjas activas de cada profesor en su zona horaria declarada y mantén el control operativo desde un solo espacio."
      >
        <Link href="/admin/teachers">
          <Button variant="outline" size="sm">Nuevo docente</Button>
        </Link>
      </PageIntro>

      <div className="space-y-4">
        {teachers.map((teacher) => (
          <Card key={teacher.id}>
            <CardTitle>{teacher.user.name}</CardTitle>
            <CardDescription>{teacher.specialty}</CardDescription>
            <div className="mt-3">
              <AvailabilityManager
                teacherId={teacher.id}
                timezone={teacher.user.timezone}
                items={teacher.availability.map((slot) => ({
                  id: slot.id,
                  weekday: slot.weekday,
                  startMinuteLocal: slot.startMinuteLocal,
                  endMinuteLocal: slot.endMinuteLocal,
                  timezone: slot.timezone,
                }))}
              />
            </div>
          </Card>
        ))}
        {!teachers.length ? (
          <Card>
            <CardTitle>Sin docentes cargados</CardTitle>
            <CardDescription>Agrega docentes para gestionar disponibilidad.</CardDescription>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
