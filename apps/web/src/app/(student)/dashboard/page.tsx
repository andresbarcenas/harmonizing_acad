import Link from "next/link";
import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { requireViewer } from "@/features/auth/server";
import { getStudentDashboard } from "@/features/student/data";
import { formatUtcToLocal } from "@/lib/timezone";
import { buildWhatsAppPlanLink } from "@/lib/whatsapp";

export default async function StudentDashboardPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentDashboard(viewer.studentProfileId!);

  const teacher = data.student?.assignment?.teacher;

  return (
    <AppShell role={viewer.role} activePath="/dashboard" userName={viewer.name}>
      <div className="space-y-4">
        <div className="card-grid">
          <MetricCard title="Plan actual" value="$90 USD / 4 clases" subtitle="Gestión por WhatsApp" />
          <MetricCard title="Clases restantes" value={`${data.remainingClasses}`} subtitle={`${data.usedClasses} usadas este mes`} />
          <MetricCard title="Nivel actual" value={(data.progress?.level ?? "BEGINNER").replace("_", " ")} subtitle="Actualizado por tu profesora" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Próxima clase</CardTitle>
            {data.upcomingClass ? (
              <>
                <p className="mt-2 text-xl font-semibold">{formatUtcToLocal(data.upcomingClass.startsAtUtc, viewer.timezone)}</p>
                <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{data.upcomingClass.lessonFocus ?? "Sesión personalizada"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={data.upcomingClass.meetingUrl} target="_blank" rel="noreferrer">
                    <Button variant="gold">Join Class</Button>
                  </a>
                  <Link href="/schedule">
                    <Button variant="outline">Reagendar</Button>
                  </Link>
                </div>
              </>
            ) : (
              <CardDescription className="mt-2">No tienes clase agendada esta semana.</CardDescription>
            )}
          </Card>

          <Card>
            <CardTitle>Docente asignada</CardTitle>
            {teacher ? (
              <div className="mt-3 flex items-center gap-3">
                <Avatar src={teacher.user.image} alt={teacher.user.name} fallback={teacher.user.name.slice(0, 1)} />
                <div>
                  <p className="font-semibold">{teacher.user.name}</p>
                  <p className="text-sm text-[var(--color-ink-soft)]">{teacher.specialty}</p>
                </div>
              </div>
            ) : (
              <CardDescription className="mt-2">Aún no hay docente asignado.</CardDescription>
            )}
            {data.latestCompleted?.lastClassNotes ? (
              <div className="mt-4 rounded-xl bg-[var(--color-muted)] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">Última nota de clase</p>
                <p className="mt-1 text-sm">{data.latestCompleted.lastClassNotes}</p>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Canciones aprendidas</CardTitle>
            <div className="mt-3 space-y-2">
              {data.songs.map((song) => (
                <div key={song.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{song.title}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{song.artist}</p>
                  </div>
                  <Badge variant="gold">Completada</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Objetivos próximos</CardTitle>
            <div className="mt-3 space-y-2">
              {data.goals.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
                  <p className="text-sm font-medium">{goal.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">Meta: {new Date(goal.targetDate).toLocaleDateString("es-US")}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <CardTitle>Manage my plan</CardTitle>
            <CardDescription>Pagos y ajustes de plan se gestionan por WhatsApp.</CardDescription>
          </div>
          <a href={buildWhatsAppPlanLink()} target="_blank" rel="noreferrer">
            <Button variant="gold">Abrir WhatsApp</Button>
          </a>
        </Card>
      </div>
    </AppShell>
  );
}
