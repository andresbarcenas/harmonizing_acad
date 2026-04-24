import { Role } from "@prisma/client";

import { RescheduleWidget } from "@/components/schedule/reschedule-widget";
import { WeeklyCalendar } from "@/components/schedule/weekly-calendar";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentSchedule } from "@/features/scheduling/data";
import { formatUtcToLocal } from "@/lib/timezone";

export default async function StudentSchedulePage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentSchedule(viewer.studentProfileId!);

  return (
    <AppShell role={viewer.role} activePath="/schedule" userName={viewer.name}>
      <PageIntro
        eyebrow="Agenda semanal"
        title="Reagenda con claridad y sin romper tu ritmo."
        description="Consulta tu calendario semanal con horarios localizados en tu zona horaria y propón cambios en un flujo breve, elegante y fácil de entender."
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardTitle>Calendario semanal</CardTitle>
          <CardDescription>Solo ves disponibilidad de tu profesora asignada.</CardDescription>
          <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
            Tu zona horaria: <span className="font-semibold text-[var(--color-ink)]">{viewer.timezone}</span>
            {data.assignedTeacher?.user.timezone ? (
              <>
                {" "}· Zona docente:{" "}
                <span className="font-semibold text-[var(--color-ink)]">{data.assignedTeacher.user.timezone}</span>
              </>
            ) : null}
          </p>
          <div className="mt-4">
            <WeeklyCalendar timezone={viewer.timezone} sessions={data.sessions} slots={data.slots} />
          </div>
          <div className="mt-4 rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">Política de cancelación</p>
            <p className="mt-1 text-sm">Puedes reagendar con al menos 12 horas de anticipación. Cambios tardíos quedan sujetos a aprobación docente.</p>
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
        <Card>
          <CardTitle>Solicitudes pendientes</CardTitle>
          <CardDescription>Te notificaremos cuando tu docente acepte o rechace la propuesta.</CardDescription>
          <div className="mt-3 space-y-2">
            {data.pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm">{formatUtcToLocal(request.proposedStartUtc, viewer.timezone)}</p>
                  {request.studentMessage ? <p className="text-xs text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
                </div>
                <Badge variant="warning">Pendiente aprobación</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
