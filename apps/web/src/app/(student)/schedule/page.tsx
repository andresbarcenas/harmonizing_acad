import { Role } from "@prisma/client";

import { RescheduleWidget } from "@/components/schedule/reschedule-widget";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { getStudentSchedule } from "@/features/scheduling/data";
import { formatUtcToLocal } from "@/lib/timezone";

export default async function StudentSchedulePage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentSchedule(viewer.studentProfileId!);

  return (
    <AppShell role={viewer.role} activePath="/schedule" userName={viewer.name}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Calendario semanal</CardTitle>
          <CardDescription>Solo ves disponibilidad de tu profesora asignada.</CardDescription>
          <div className="mt-4 space-y-2">
            {data.sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
                <p className="text-sm font-medium">{formatUtcToLocal(session.startsAtUtc, viewer.timezone)}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{session.lessonFocus ?? "Clase personalizada"}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[var(--color-muted)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">Política de cancelación</p>
            <p className="mt-1 text-sm">Puedes reagendar con al menos 12 horas de anticipación. Cambios tardíos quedan sujetos a aprobación.</p>
          </div>
        </Card>

        {data.sessions[0] ? (
          <RescheduleWidget
            sessionId={data.sessions[0].id}
            timezone={viewer.timezone}
            slots={data.slots.map((slot) => ({
              startUtc: slot.startUtc.toISOString(),
              endUtc: slot.endUtc.toISOString(),
            }))}
          />
        ) : (
          <Card>
            <CardTitle>No hay clases para reagendar</CardTitle>
            <CardDescription>Cuando tengas una próxima clase, podrás proponer un nuevo horario en 2 clics.</CardDescription>
          </Card>
        )}
      </div>

      {data.pendingRequests.length ? (
        <Card className="mt-4">
          <CardTitle>Solicitudes pendientes</CardTitle>
          <div className="mt-3 space-y-2">
            {data.pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
                <p className="text-sm">{formatUtcToLocal(request.proposedStartUtc, viewer.timezone)}</p>
                <Badge variant="warning">Pendiente aprobación</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
