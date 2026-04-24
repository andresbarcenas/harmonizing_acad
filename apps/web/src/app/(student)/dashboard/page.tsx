import Link from "next/link";
import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { MetricCard } from "@/components/dashboard/metric-card";
import { requireViewer } from "@/features/auth/server";
import { getStudentDashboardData } from "@/lib/data";
import { formatUtcToLocal } from "@/lib/timezone";
import { buildWhatsAppPlanLink } from "@/lib/whatsapp";

export default async function StudentDashboardPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentDashboardData(viewer);

  const teacher = data.student?.assignment?.teacher;

  return (
    <AppShell role={viewer.role} activePath="/dashboard" userName={viewer.name}>
      <PageIntro
        eyebrow="Mi membresía"
        title="Tu espacio musical, claro y exclusivo."
        description="Sigue tu progreso, revisa tu próxima clase y mantén tu plan al día con una experiencia pensada para acompañarte sin fricción."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/72 px-2.5 py-1.5">
            <Avatar
              src={viewer.image}
              alt={viewer.name}
              fallback={viewer.name.slice(0, 1).toUpperCase()}
              className="h-8 w-8 text-[10px]"
            />
            <span className="max-w-[180px] truncate text-xs font-medium text-[var(--color-ink-soft)]">{viewer.name}</span>
          </div>
          {data.upcomingClass ? <Badge variant="gold">Próxima clase: {formatUtcToLocal(data.upcomingClass.startsAtUtc, viewer.timezone)}</Badge> : null}
          {teacher ? <Badge variant="default">Docente asignada: {teacher.user.name}</Badge> : null}
        </div>
      </PageIntro>

      <div className="card-grid">
        <MetricCard title="Plan actual" value="$90 USD / 4 clases" subtitle="Gestión directa por WhatsApp" />
        <MetricCard title="Clases restantes" value={`${data.remainingClasses}`} subtitle={`${data.usedClasses} usadas este mes`} />
        <MetricCard title="Nivel actual" value={(data.progress?.level ?? "BEGINNER").replace("_", " ")} subtitle="Actualizado por tu profesora" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardTitle>Próxima clase</CardTitle>
          {data.upcomingClass ? (
            <>
              <p className="mt-4 break-words font-display text-3xl tracking-[-0.05em] sm:text-4xl">{formatUtcToLocal(data.upcomingClass.startsAtUtc, viewer.timezone)}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{data.upcomingClass.lessonFocus ?? "Sesión personalizada"}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={data.upcomingClass.meetingUrl} target="_blank" rel="noreferrer">
                  <Button variant="gold">Entrar a clase</Button>
                </a>
                <Link href="/schedule">
                  <Button variant="outline">Reagendar</Button>
                </Link>
              </div>
            </>
          ) : (
            <CardDescription className="mt-3">No tienes clase agendada esta semana.</CardDescription>
          )}
        </Card>

        <Card>
          <CardTitle>Docente asignada</CardTitle>
          {teacher ? (
            <div className="mt-4 flex items-center gap-3">
              <Avatar src={teacher.user.image} alt={teacher.user.name} fallback={teacher.user.name.slice(0, 1)} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{teacher.user.name}</p>
                <p className="text-sm text-[var(--color-ink-soft)]">{teacher.specialty}</p>
              </div>
            </div>
          ) : (
            <CardDescription className="mt-3">Aún no hay docente asignado.</CardDescription>
          )}
          {data.latestCompleted?.lastClassNotes ? (
            <div className="mt-5 rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">Última nota de clase</p>
              <p className="mt-2 text-sm leading-6">{data.latestCompleted.lastClassNotes}</p>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Canciones aprendidas</CardTitle>
          <div className="mt-4 space-y-2">
            {data.songs.map((song) => (
              <div key={song.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{song.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{song.artist}</p>
                </div>
                <Badge variant="gold">Completada</Badge>
              </div>
            ))}
            {!data.songs.length ? <p className="text-sm text-[var(--color-ink-soft)]">Aún no registras canciones aprendidas.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Objetivos próximos</CardTitle>
          <div className="mt-4 space-y-2">
            {data.goals.map((goal) => (
              <div key={goal.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                <p className="text-sm font-medium">{goal.title}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">Meta: {new Date(goal.targetDate).toLocaleDateString("es-US")}</p>
              </div>
            ))}
            {!data.goals.length ? <p className="text-sm text-[var(--color-ink-soft)]">Aún no tienes objetivos definidos.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <CardTitle>Gestionar mi plan</CardTitle>
          <CardDescription>Pagos y ajustes de plan se atienden por WhatsApp con acompañamiento directo.</CardDescription>
        </div>
        <a href={buildWhatsAppPlanLink()} target="_blank" rel="noreferrer">
          <Button variant="gold">Abrir WhatsApp</Button>
        </a>
      </Card>
    </AppShell>
  );
}
