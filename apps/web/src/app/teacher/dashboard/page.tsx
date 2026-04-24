import { Role, SessionStatus } from "@prisma/client";

import { TeacherSessionActions } from "@/components/teacher/session-actions";
import { SeriesActions } from "@/components/teacher/series-actions";
import { RecurringClassForm } from "@/components/teacher/recurring-class-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherDashboard } from "@/features/teacher/data";
import { formatUtcToLocal } from "@/lib/timezone";

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function TeacherDashboardPage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const data = await getTeacherDashboard(viewer.teacherProfileId!);

  return (
    <AppShell role={viewer.role} activePath="/teacher/dashboard" userName={viewer.name}>
      <PageIntro
        eyebrow="Panel docente"
        title="Tu jornada docente, más clara y mejor organizada."
        description="Consulta tus clases del día, revisa prácticas pendientes y responde solicitudes desde un espacio más calmado, sin perder velocidad de lectura."
      />

      <div className="card-grid">
        <Card>
          <CardTitle>Clases hoy</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">{data.classesToday.length}</p>
        </Card>
        <Card>
          <CardTitle>Estudiantes asignados</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">{data.students.length}</p>
        </Card>
        <Card>
          <CardTitle>Solicitudes pendientes</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">{data.pendingRequests.length}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Programar clases recurrentes</CardTitle>
        <CardDescription>
          Crea una serie semanal para estudiantes asignados. El sistema evita cruces de horario con clases existentes.
        </CardDescription>
        <div className="mt-4">
          <RecurringClassForm
            students={data.students.map((assignment) => ({
              id: assignment.student.id,
              name: assignment.student.user.name,
              instrument: assignment.student.preferredInstrument,
            }))}
            defaultTimezone={viewer.timezone}
            defaultMeetingUrl={data.teacher?.zoomLink ?? data.teacher?.meetLink ?? ""}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Series recurrentes</CardTitle>
        <CardDescription>Gestiona clases recurrentes activas o elimina series cuando sea necesario.</CardDescription>
        <div className="mt-3 space-y-2">
          {data.recurringSeries.map((series) => (
            <div key={series.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{series.student.user.name}</p>
                <Badge variant={series.active ? "gold" : "default"}>{series.active ? "Activa" : "Detenida"}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                {series.weekdays.map((day) => dayNames[day] ?? day).join(", ")} · {series.startTimeLocal} · cada {series.intervalWeeks} semana(s)
              </p>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Próximas clases: {series.sessions.length} · Zona: {series.timezone}
              </p>
              <SeriesActions seriesId={series.id} isActive={series.active} />
            </div>
          ))}
          {!data.recurringSeries.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">No hay series recurrentes creadas.</p>
          ) : null}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle>Agenda de hoy</CardTitle>
          <div className="mt-3 space-y-2">
            {data.classesToday.map((session) => (
              <div key={session.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                      src={session.student.user.image}
                      alt={session.student.user.name}
                      fallback={session.student.user.name.slice(0, 1).toUpperCase()}
                      className="h-8 w-8 text-[10px]"
                    />
                    <p className="truncate text-sm font-medium">{session.student.user.name}</p>
                  </div>
                  <Badge variant={session.status === SessionStatus.COMPLETED ? "success" : "default"}>{session.status}</Badge>
                </div>
                <p className="text-[11px] text-[var(--color-ink-soft)]">
                  Docente: {formatUtcToLocal(session.startsAtUtc, viewer.timezone)} ({viewer.timezone})
                </p>
                <p className="text-[11px] text-[var(--color-ink-soft)]">
                  Estudiante: {formatUtcToLocal(session.startsAtUtc, session.student.user.timezone)} ({session.student.user.timezone})
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={session.meetingUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="gold">Join Class</Button>
                  </a>
                  <a href="/teacher/requests">
                    <Button size="sm" variant="outline">Ver reagendaciones</Button>
                  </a>
                </div>
                <TeacherSessionActions sessionId={session.id} initialNotes={session.lastClassNotes} />
              </div>
            ))}
            {!data.classesToday.length ? <p className="text-sm text-[var(--color-ink-soft)]">No tienes clases para hoy.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Videos por revisar</CardTitle>
          <CardDescription>Acceso rápido a prácticas semanales.</CardDescription>
          <div className="mt-3 space-y-2">
            {data.pendingVideos.slice(0, 6).map((video) => (
              <div key={video.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    src={video.student.user.image}
                    alt={video.student.user.name}
                    fallback={video.student.user.name.slice(0, 1).toUpperCase()}
                    className="h-8 w-8 text-[10px]"
                  />
                  <p className="truncate text-sm font-medium">{video.student.user.name}</p>
                </div>
                <p className="text-xs text-[var(--color-ink-soft)]">{video.originalName}</p>
              </div>
            ))}
            {!data.pendingVideos.length ? <p className="text-sm text-[var(--color-ink-soft)]">No hay videos pendientes.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Estudiantes asignados</CardTitle>
          <CardDescription>Lista activa para acceso rápido.</CardDescription>
          <div className="mt-3 space-y-2">
            {data.students.map((assignment) => (
              <div key={assignment.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    src={assignment.student.user.image}
                    alt={assignment.student.user.name}
                    fallback={assignment.student.user.name.slice(0, 1).toUpperCase()}
                    className="h-8 w-8 text-[10px]"
                  />
                  <p className="truncate text-sm font-medium">{assignment.student.user.name}</p>
                </div>
                <p className="text-xs text-[var(--color-ink-soft)]">{assignment.student.preferredInstrument ?? "Música general"}</p>
              </div>
            ))}
            {!data.students.length ? <p className="text-sm text-[var(--color-ink-soft)]">Aún no tienes estudiantes asignados.</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle>Solicitudes recientes de reagendación</CardTitle>
          <a href="/teacher/requests">
            <Button size="sm" variant="outline">Abrir bandeja</Button>
          </a>
        </div>
        <div className="mt-3 space-y-2">
          {data.pendingRequests.slice(0, 5).map((request) => (
            <div key={request.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  src={request.session.student.user.image}
                  alt={request.session.student.user.name}
                  fallback={request.session.student.user.name.slice(0, 1).toUpperCase()}
                  className="h-8 w-8 text-[10px]"
                />
                <p className="truncate text-sm font-medium">{request.session.student.user.name}</p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{formatUtcToLocal(request.proposedStartUtc, viewer.timezone)}</p>
              <p className="text-[11px] text-[var(--color-ink-soft)]">
                Docente: {formatUtcToLocal(request.proposedStartUtc, viewer.timezone)} ({viewer.timezone})
              </p>
              <p className="text-[11px] text-[var(--color-ink-soft)]">
                Estudiante: {formatUtcToLocal(request.proposedStartUtc, request.session.student.user.timezone)} ({request.session.student.user.timezone})
              </p>
              {request.studentMessage ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
            </div>
          ))}
          {!data.pendingRequests.length ? <p className="text-sm text-[var(--color-ink-soft)]">Sin solicitudes pendientes por ahora.</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
