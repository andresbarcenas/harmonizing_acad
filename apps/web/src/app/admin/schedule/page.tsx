import { ClassRequestStatus, Role } from "@prisma/client";

import { ClassRequestActions } from "@/components/schedule/class-request-actions";
import { ClassSessionDayList } from "@/components/schedule/class-session-day-list";
import { SingleClassBookingForm } from "@/components/schedule/single-class-booking-form";
import { SeriesActions } from "@/components/teacher/series-actions";
import { RecurringClassForm } from "@/components/teacher/recurring-class-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminScheduleData } from "@/lib/data";
import { formatDateTimeInZone } from "@/lib/i18n";
import { classRequestStatusLabel, classTypeLabel } from "@/lib/class-session-labels";

const dayNames = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
} as const;

export default async function AdminSchedulePage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getAdminScheduleData(viewer);
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/schedule" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Gestión de agenda" : "Schedule management"}
        title={isSpanish ? "Agenda clases únicas sin romper las series recurrentes." : "Book one-off classes without disturbing recurring series."}
        description={isSpanish ? "Crea pruebas, reposiciones, evaluaciones y clases extra con validación de conflictos y notificaciones automáticas." : "Create trials, makeups, evaluations, and extras with conflict checks and automatic notifications."}
      />

      <Card>
        <CardTitle>{isSpanish ? "Agendar clase individual" : "Book one-time class"}</CardTitle>
        <CardDescription>{isSpanish ? "El sistema bloquea cruces de docente y estudiante; las clases canceladas no bloquean agenda." : "The system blocks teacher/student overlaps; cancelled classes do not block schedule."}</CardDescription>
        <div className="mt-4">
          <SingleClassBookingForm
            role="admin"
            students={data.students.map((student) => ({ id: student.id, name: student.user.name, instrument: student.preferredInstrument, teacherId: student.assignment?.teacherId, timezone: student.user.timezone }))}
            teachers={data.teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name, timezone: teacher.user.timezone }))}
            defaultTimezone={viewer.timezone}
            locale={viewer.locale}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>{isSpanish ? "Configurar clases recurrentes" : "Set up recurring classes"}</CardTitle>
        <CardDescription>{isSpanish ? "Crea una serie fija para cualquier estudiante y docente." : "Create a fixed series for any student and teacher."}</CardDescription>
        <div className="mt-4">
          <RecurringClassForm
            role="admin"
            students={data.students.map((student) => ({ id: student.id, name: student.user.name, instrument: student.preferredInstrument, timezone: student.user.timezone }))}
            teachers={data.teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name, timezone: teacher.user.timezone }))}
            defaultTimezone={viewer.timezone}
            locale={viewer.locale}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{isSpanish ? "Series recurrentes" : "Recurring series"}</CardTitle>
            <CardDescription>
              {isSpanish
                ? "Gestiona series activas o detenidas sin perder el historial de clases completadas."
                : "Manage active or stopped series without losing completed class history."}
            </CardDescription>
          </div>
          <Badge variant="gold">{data.recurringSeries.length}</Badge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {data.recurringSeries.map((series) => (
            <div key={series.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/70 p-4 shadow-[0_12px_30px_rgba(78,55,30,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{series.student.user.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {isSpanish ? "Docente" : "Teacher"}: <span className="font-semibold text-[var(--color-ink)]">{series.teacher.user.name}</span>
                  </p>
                </div>
                <Badge variant={series.active ? "gold" : "default"}>{series.active ? (isSpanish ? "Activa" : "Active") : (isSpanish ? "Detenida" : "Stopped")}</Badge>
              </div>
              <div className="mt-3 grid gap-2 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-cream)]/70 p-3 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Días" : "Days"}:</span>{" "}
                  {series.weekdays.map((day) => dayNames[viewer.locale][day] ?? day).join(", ")}
                </p>
                <p>
                  <span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Hora" : "Time"}:</span> {series.startTimeLocal} · {series.durationMin} min
                </p>
                <p>
                  <span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Frecuencia" : "Frequency"}:</span>{" "}
                  {isSpanish ? "cada" : "every"} {series.intervalWeeks} {isSpanish ? "semana(s)" : "week(s)"}
                </p>
                <p>
                  <span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Próximas" : "Upcoming"}:</span> {series.sessions.length}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Zona" : "Timezone"}:</span> {series.timezone} ·{" "}
                  {recurringTimezoneModeLabel(series.timezoneMode, viewer.locale)}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Creada" : "Created"}:</span>{" "}
                  {formatDateTimeInZone(series.createdAt, viewer.timezone, viewer.locale)}
                  {series.stoppedAt
                    ? ` · ${isSpanish ? "detenida" : "stopped"} ${formatDateTimeInZone(series.stoppedAt, viewer.timezone, viewer.locale)}`
                    : ""}
                </p>
              </div>
              {series.lessonFocus ? (
                <p className="mt-3 rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-gold-soft)]/55 px-3 py-2 text-xs text-[var(--color-ink)]">
                  <span className="font-semibold">{isSpanish ? "Enfoque" : "Focus"}:</span> {series.lessonFocus}
                </p>
              ) : null}
              <SeriesActions seriesId={series.id} isActive={series.active} locale={viewer.locale} />
            </div>
          ))}
          {!data.recurringSeries.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">{isSpanish ? "No hay series recurrentes creadas." : "No recurring series created."}</p>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardTitle>{isSpanish ? "Clases programadas" : "Scheduled classes"}</CardTitle>
          <CardDescription>{isSpanish ? "Recurrentes e individuales en una sola vista operacional." : "Recurring and one-off classes in one operational view."}</CardDescription>
          <div className="mt-4">
            <ClassSessionDayList
              locale={viewer.locale}
              emptyText={isSpanish ? "No hay clases próximas." : "No upcoming classes."}
              showTeacherTime
              sessions={data.sessions.map((session) => ({
                id: session.id,
                startsAtUtc: session.startsAtUtc,
                endsAtUtc: session.endsAtUtc,
                type: session.type,
                status: session.status,
                startedAt: session.startedAt,
                primaryName: session.student.user.name,
                secondaryName: session.teacher.user.name,
                viewerTimezone: viewer.timezone,
                studentTimezone: session.student.user.timezone,
                teacherTimezone: session.teacher.user.timezone,
                lessonFocus: session.lessonFocus,
                attachmentCount: session._count.attachments,
                detailHref: `/classes/${session.id}`,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Solicitudes de clase" : "Class requests"}</CardTitle>
          <CardDescription>{isSpanish ? "Aprueba o rechaza solicitudes de estudiantes." : "Approve or reject student requests."}</CardDescription>
          <div className="mt-4 space-y-3">
            {data.classRequests.map((request) => (
              <div key={request.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{request.student.user.name}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{request.teacher.user.name} · {classTypeLabel(request.type, viewer.locale)}</p>
                  </div>
                  <Badge variant={request.status === ClassRequestStatus.PENDING ? "warning" : request.status === ClassRequestStatus.ACCEPTED ? "success" : "default"}>{classRequestStatusLabel(request.status, viewer.locale)}</Badge>
                </div>
                <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(request.preferredStartUtc, viewer.timezone, viewer.locale)} · {request.durationMin} min</p>
                {request.studentMessage ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
                {request.status === ClassRequestStatus.REJECTED && request.rejectionReason ? (
                  <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {isSpanish ? "Motivo de rechazo" : "Rejection reason"}: {request.rejectionReason}
                  </p>
                ) : null}
                {request.internalNote ? (
                  <p className="mt-2 rounded-xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                    {isSpanish ? "Nota interna" : "Internal note"}: {request.internalNote}
                  </p>
                ) : null}
                {request.status === ClassRequestStatus.PENDING ? <div className="mt-3"><ClassRequestActions requestId={request.id} locale={viewer.locale} /></div> : null}
              </div>
            ))}
            {!data.classRequests.length ? <CardDescription>{isSpanish ? "No hay solicitudes pendientes o recientes." : "No pending or recent requests."}</CardDescription> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function recurringTimezoneModeLabel(mode: string | null | undefined, locale: "en" | "es") {
  if (mode === "TEACHER_TIME") return locale === "es" ? "Hora local docente" : "Teacher local time";
  if (mode === "CUSTOM_TIMEZONE") return locale === "es" ? "Zona personalizada" : "Custom timezone";
  return locale === "es" ? "Hora local del estudiante" : "Student local time";
}
