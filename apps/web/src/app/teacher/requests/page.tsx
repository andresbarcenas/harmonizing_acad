import { Role, RescheduleStatus } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { RequestActions } from "@/components/schedule/request-actions";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatUtcToLocal } from "@/lib/timezone";

export default async function TeacherRequestsPage() {
  const viewer = await requireViewer([Role.TEACHER]);

  const requests = await db.rescheduleRequest.findMany({
    where: {
      status: RescheduleStatus.PENDING,
      session: { teacherId: viewer.teacherProfileId! },
    },
    include: {
      session: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell role={viewer.role} activePath="/teacher/requests" userName={viewer.name}>
      <PageIntro
        eyebrow="Reagendaciones"
        title="Aprueba cambios con contexto y sin fricción."
        description="Cada solicitud muestra la clase original, la propuesta nueva y el mensaje del estudiante para ayudarte a decidir con rapidez."
      />

      <Card>
        <CardTitle>Solicitudes de reagendación</CardTitle>
        <CardDescription>Aprueba o rechaza cambios con un clic.</CardDescription>
        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-[1.3rem] border border-[var(--color-border)] bg-white/68 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{request.session.student.user.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    Original docente: {formatUtcToLocal(request.session.startsAtUtc, viewer.timezone)} ({viewer.timezone})
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    Original estudiante: {formatUtcToLocal(request.session.startsAtUtc, request.session.student.user.timezone)} ({request.session.student.user.timezone})
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    Propuesto docente: {formatUtcToLocal(request.proposedStartUtc, viewer.timezone)} ({viewer.timezone})
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    Propuesto estudiante: {formatUtcToLocal(request.proposedStartUtc, request.session.student.user.timezone)} ({request.session.student.user.timezone})
                  </p>
                </div>
                <Badge variant="warning">Pendiente</Badge>
              </div>
              <p className="mt-2 break-words text-sm">{request.studentMessage}</p>
              <div className="mt-3">
                <RequestActions requestId={request.id} />
              </div>
            </div>
          ))}
          {!requests.length ? <p className="text-sm text-[var(--color-ink-soft)]">No hay solicitudes pendientes.</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
