import { Role, SessionStatus } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { getTeacherDashboard } from "@/features/teacher/data";
import { formatUtcToLocal } from "@/lib/timezone";

export default async function TeacherDashboardPage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const data = await getTeacherDashboard(viewer.teacherProfileId!);

  return (
    <AppShell role={viewer.role} activePath="/teacher/dashboard" userName={viewer.name}>
      <div className="card-grid">
        <Card>
          <CardTitle>Clases hoy</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{data.classesToday.length}</p>
        </Card>
        <Card>
          <CardTitle>Estudiantes asignados</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{data.students.length}</p>
        </Card>
        <Card>
          <CardTitle>Solicitudes pendientes</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{data.pendingRequests.length}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Agenda de hoy</CardTitle>
          <div className="mt-3 space-y-2">
            {data.classesToday.map((session) => (
              <div key={session.id} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{session.student.user.name}</p>
                  <Badge variant={session.status === SessionStatus.COMPLETED ? "success" : "default"}>{session.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{formatUtcToLocal(session.startsAtUtc, viewer.timezone)}</p>
                <div className="mt-3 flex gap-2">
                  <a href={session.meetingUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="gold">Join</Button>
                  </a>
                  <a href="/teacher/requests">
                    <Button size="sm" variant="outline">Gestionar estado</Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Videos por revisar</CardTitle>
          <CardDescription>Acceso rápido a prácticas semanales.</CardDescription>
          <div className="mt-3 space-y-2">
            {data.pendingVideos.slice(0, 6).map((video) => (
              <div key={video.id} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
                <p className="text-sm font-medium">{video.student.user.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{video.originalName}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
