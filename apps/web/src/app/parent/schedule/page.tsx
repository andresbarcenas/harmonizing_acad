import { ClassRequestStatus, Role, SessionStatus } from "@prisma/client";
import Link from "next/link";

import { ClassRequestForm } from "@/components/schedule/class-request-form";
import { ClassSessionDayList } from "@/components/schedule/class-session-day-list";
import { RescheduleWidget } from "@/components/schedule/reschedule-widget";
import { WeeklyCalendar } from "@/components/schedule/weekly-calendar";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { classRequestStatusLabel, classTypeLabel } from "@/lib/class-session-labels";
import { getStudentScheduleDataForProfile } from "@/lib/data";
import { formatDateTimeInZone } from "@/lib/i18n";
import { resolveParentStudentSelection } from "@/lib/parents";

export default async function ParentSchedulePage({ searchParams }: { searchParams?: Promise<{ studentId?: string; week?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const selectedStudentId = selection.selectedStudentId;
  const isSpanish = viewer.locale === "es";

  if (!selectedStudentId) {
    return (
      <AppShell role={viewer.role} activePath="/parent/schedule" userName={viewer.name} locale={viewer.locale}>
        <PageIntro eyebrow={isSpanish ? "Agenda familiar" : "Family schedule"} title={isSpanish ? "Aún no hay estudiantes vinculados." : "No linked students yet."} description={isSpanish ? "Administración puede vincular estudiantes a esta cuenta familiar." : "An admin can link students to this family account."} />
      </AppShell>
    );
  }

  const data = await getStudentScheduleDataForProfile(selectedStudentId, { week: params?.week });
  const selectedStudent = selection.selectedLink?.student;
  const studentTimezone = selectedStudent?.user.timezone ?? viewer.timezone;
  const reschedulableSession = data.sessions.find((session) => session.startsAtUtc >= new Date() && (session.status === SessionStatus.SCHEDULED || session.status === SessionStatus.RESCHEDULE_PENDING)) ?? null;
  const nextUpcomingWeekHref = data.nextUpcomingSession ? scheduleWeekHref(data.nextUpcomingSession.startsAtUtc, studentTimezone, selectedStudentId) : null;

  return (
    <AppShell role={viewer.role} activePath="/parent/schedule" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selectedStudentId}>
      <PageIntro eyebrow={isSpanish ? "Agenda familiar" : "Family schedule"} title={isSpanish ? `Agenda de ${selectedStudent?.user.name ?? "estudiante"}` : `${selectedStudent?.user.name ?? "Student"} schedule`} description={isSpanish ? "Clases, disponibilidad, reagendaciones y solicitudes para el estudiante seleccionado." : "Classes, availability, reschedules, and requests for the selected student."} />

      <Card density="compact">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{isSpanish ? "Calendario semanal" : "Weekly calendar"}</CardTitle>
            <CardDescription>{isSpanish ? "Disponibilidad de la docente asignada." : "Availability from the assigned teacher."}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
              {studentTimezone}{data.assignedTeacher?.user.timezone ? ` · ${isSpanish ? "Docente" : "Teacher"}: ${data.assignedTeacher.user.timezone}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <ScheduleLink href={`/parent/schedule?studentId=${selectedStudentId}&week=${data.week.previousWeekKey}`}>{isSpanish ? "Semana anterior" : "Previous week"}</ScheduleLink>
              <ScheduleLink href={`/parent/schedule?studentId=${selectedStudentId}&week=${data.week.currentWeekKey}`} active={data.week.startKey === data.week.currentWeekKey}>{isSpanish ? "Esta semana" : "This week"}</ScheduleLink>
              <ScheduleLink href={`/parent/schedule?studentId=${selectedStudentId}&week=${data.week.nextWeekKey}`}>{isSpanish ? "Siguiente semana" : "Next week"}</ScheduleLink>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <WeeklyCalendar
            timezone={studentTimezone}
            sessions={data.sessions.map((session) => ({ id: session.id, startsAtUtc: session.startsAtUtc, lessonFocus: session.lessonFocus, type: session.type, attachmentCount: session._count.attachments }))}
            slots={data.slots}
            weekStartUtc={data.week.startUtc}
            locale={viewer.locale}
          />
        </div>
      </Card>

      {!data.sessions.length && data.nextUpcomingSession ? (
        <Card variant="inset" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{isSpanish ? "No hay clases esta semana" : "No classes this week"}</CardTitle>
            <CardDescription>{isSpanish ? "La próxima clase está programada" : "Next class is scheduled"} {formatDateTimeInZone(data.nextUpcomingSession.startsAtUtc, studentTimezone, viewer.locale)}.</CardDescription>
          </div>
          {nextUpcomingWeekHref ? <Link href={nextUpcomingWeekHref} className="inline-flex h-11 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,var(--color-gold),var(--color-gold-deep))] px-5 text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-glow)] transition duration-200 ease-out hover:-translate-y-0.5 hover:brightness-95 focus:ring-2 focus:ring-[var(--focus-ring)] focus:outline-none">{isSpanish ? "Ir a esa semana" : "Go to that week"}</Link> : null}
        </Card>
      ) : null}

      <Card density="compact">
        <CardTitle>{isSpanish ? "Clases próximas y recientes" : "Upcoming and recent classes"}</CardTitle>
        <CardDescription>{isSpanish ? "Consulta clases pasadas y próximas, con materiales y detalle." : "Review past and upcoming classes, with materials and class details."}</CardDescription>
        <div className="mt-4">
          <ClassSessionDayList
            locale={viewer.locale}
            emptyText={isSpanish ? "No hay clases recientes o próximas." : "No recent or upcoming classes."}
            showTeacherTime={Boolean(data.assignedTeacher?.user.timezone)}
            sessions={data.classListSessions.map((session) => ({
              id: session.id,
              startsAtUtc: session.startsAtUtc,
              endsAtUtc: session.endsAtUtc,
              type: session.type,
              status: session.status,
              startedAt: session.startedAt,
              primaryName: session.teacher.user.name,
              primaryImage: session.teacher.user.image,
              viewerTimezone: studentTimezone,
              studentTimezone,
              teacherTimezone: session.teacher.user.timezone,
              lessonFocus: session.lessonFocus,
              attachmentCount: session._count.attachments,
              detailHref: `/classes/${session.id}`,
            }))}
          />
        </div>
      </Card>

      {reschedulableSession ? (
        <RescheduleWidget
          sessionId={reschedulableSession.id}
          studentId={selectedStudentId}
          sessions={data.sessions.map((session) => ({ id: session.id, startsAtUtc: session.startsAtUtc.toISOString(), lessonFocus: session.lessonFocus }))}
          timezone={studentTimezone}
          slots={data.slots.map((slot) => ({ startUtc: slot.startUtc.toISOString(), endUtc: slot.endUtc.toISOString() }))}
          weekStartUtc={data.week.startUtc.toISOString()}
          locale={viewer.locale}
        />
      ) : (
        <Card variant="subtle"><CardTitle>{isSpanish ? "Sin clases futuras para reagendar" : "No future classes to reschedule"}</CardTitle><CardDescription>{isSpanish ? "Cuando haya una clase próxima, podrás solicitar un cambio aquí." : "When there is an upcoming class, you can request a change here."}</CardDescription></Card>
      )}

      <Card variant="subtle">
        <CardTitle>{isSpanish ? "Solicitar clase individual" : "Request one-time class"}</CardTitle>
        <CardDescription>{isSpanish ? "Para reposiciones, práctica extra o una evaluación breve." : "For makeup lessons, extra practice, or a quick evaluation."}</CardDescription>
        <div className="mt-4"><ClassRequestForm studentId={selectedStudentId} timezone={studentTimezone} teacherTimezone={data.assignedTeacher?.user.timezone} locale={viewer.locale} /></div>
      </Card>

      {data.classRequests.length ? (
        <Card>
          <CardTitle>{isSpanish ? "Solicitudes de clases individuales" : "One-time class requests"}</CardTitle>
          <div className="mt-3 space-y-2">
            {data.classRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{classTypeLabel(request.type, viewer.locale)}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(request.preferredStartUtc, studentTimezone, viewer.locale)} · {request.durationMin} min</p>
                  {request.studentMessage ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
                </div>
                <Badge variant={request.status === ClassRequestStatus.PENDING ? "warning" : "default"}>{classRequestStatusLabel(request.status, viewer.locale)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}

function ScheduleLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition duration-200 ease-out focus:ring-2 focus:ring-[var(--focus-ring)] focus:outline-none ${active ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[0_8px_20px_rgba(135,83,29,0.08)]" : "border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-ink-soft)] hover:-translate-y-0.5 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"}`}>{children}</Link>;
}

function scheduleWeekHref(date: Date, timezone: string, studentId: string) {
  const weekKey = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `/parent/schedule?studentId=${studentId}&week=${weekKey}`;
}
