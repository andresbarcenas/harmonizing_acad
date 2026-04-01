import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function toHourLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${mins}`.padStart(2, "0")}`;
}

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
      <div className="space-y-4">
        {teachers.map((teacher) => (
          <Card key={teacher.id}>
            <CardTitle>{teacher.user.name}</CardTitle>
            <CardDescription>{teacher.specialty}</CardDescription>
            <div className="mt-3 space-y-2">
              {teacher.availability.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
                  <p className="text-sm">{weekdays[slot.weekday]}</p>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    {toHourLabel(slot.startMinuteLocal)} - {toHourLabel(slot.endMinuteLocal)} ({slot.timezone})
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
