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
import { getStudentScheduleData } from "@/lib/data";
import { formatDateTimeInZone, getDictionary } from "@/lib/i18n";

type StudentSchedulePageProps = {
  searchParams?: Promise<{ week?: string }>;
};

export default async function StudentSchedulePage({ searchParams }: StudentSchedulePageProps) {
  const viewer = await requireViewer([Role.STUDENT]);
  const dictionary = getDictionary(viewer.locale);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getStudentScheduleData(viewer, { week: resolvedSearchParams.week });
  const reschedulableSession = data.sessions.find((session) => session.startsAtUtc >= new Date() && (session.status === SessionStatus.SCHEDULED || session.status === SessionStatus.RESCHEDULE_PENDING)) ?? null;
  const nextUpcomingWeekHref = data.nextUpcomingSession
    ? scheduleWeekHref(data.nextUpcomingSession.startsAtUtc, viewer.timezone)
    : null;

  return (
    <AppShell role={viewer.role} activePath="/schedule" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.schedule.eyebrow}
        title={dictionary.schedule.title}
        description={dictionary.schedule.description}
      />

      <Card density="compact">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{dictionary.schedule.weeklyCalendar}</CardTitle>
            <CardDescription>{dictionary.schedule.assignedOnly}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
              {viewer.timezone}
              {data.assignedTeacher?.user.timezone ? ` · Docente: ${data.assignedTeacher.user.timezone}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <ScheduleLink href={`/schedule?week=${data.week.previousWeekKey}`}>{dictionary.schedule.previousWeek}</ScheduleLink>
              <ScheduleLink href={`/schedule?week=${data.week.currentWeekKey}`} active={data.week.startKey === data.week.currentWeekKey}>
                {dictionary.schedule.thisWeek}
              </ScheduleLink>
              <ScheduleLink href={`/schedule?week=${data.week.nextWeekKey}`}>{dictionary.schedule.nextWeek}</ScheduleLink>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <WeeklyCalendar
            timezone={viewer.timezone}
            sessions={data.sessions.map((session) => ({
              id: session.id,
              startsAtUtc: session.startsAtUtc,
              lessonFocus: session.lessonFocus,
              type: session.type,
              attachmentCount: session._count.attachments,
            }))}
            slots={data.slots}
            weekStartUtc={data.week.startUtc}
            locale={viewer.locale}
          />
        </div>
      </Card>

      {!data.sessions.length && data.nextUpcomingSession ? (
        <Card variant="inset" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{dictionary.schedule.noClassesWeek}</CardTitle>
            <CardDescription>
              {dictionary.schedule.nextClassScheduled} {formatDateTimeInZone(data.nextUpcomingSession.startsAtUtc, viewer.timezone, viewer.locale)}.
            </CardDescription>
          </div>
          {nextUpcomingWeekHref ? (
            <Link
              href={nextUpcomingWeekHref}
              className="inline-flex h-11 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,var(--color-gold),var(--color-gold-deep))] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition duration-200 ease-out hover:-translate-y-0.5 hover:brightness-95 focus:ring-2 focus:ring-[var(--focus-ring)] focus:outline-none"
            >
              {dictionary.schedule.goNextClass}
            </Link>
          ) : null}
        </Card>
      ) : null}

      <Card density="compact">
        <CardTitle>{viewer.locale === "es" ? "Clases próximas y recientes" : "Upcoming and recent classes"}</CardTitle>
        <CardDescription>
          {viewer.locale === "es"
            ? "Consulta tus clases pasadas y próximas, con materiales y detalle de cada clase."
            : "Review past and upcoming classes, with materials and class details."}
        </CardDescription>
        <div className="mt-4">
          <ClassSessionDayList
            locale={viewer.locale}
            emptyText={viewer.locale === "es" ? "No hay clases recientes o próximas." : "No recent or upcoming classes."}
            showTeacherTime={Boolean(data.assignedTeacher?.user.timezone)}
            sessions={data.classListSessions.map((session) => ({
              id: session.id,
              startsAtUtc: session.startsAtUtc,
              endsAtUtc: session.endsAtUtc,
              type: session.type,
              status: session.status,
              primaryName: session.teacher.user.name,
              primaryImage: session.teacher.user.image,
              viewerTimezone: viewer.timezone,
              studentTimezone: viewer.timezone,
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
          sessions={data.sessions.map((session) => ({
            id: session.id,
            startsAtUtc: session.startsAtUtc.toISOString(),
            lessonFocus: session.lessonFocus,
          }))}
          timezone={viewer.timezone}
          slots={data.slots.map((slot) => ({
            startUtc: slot.startUtc.toISOString(),
            endUtc: slot.endUtc.toISOString(),
          }))}
          weekStartUtc={data.week.startUtc.toISOString()}
          locale={viewer.locale}
        />
      ) : (
        <Card variant="subtle">
          <CardTitle>{data.sessions.length ? dictionary.schedule.noFutureReschedule : dictionary.schedule.noReschedule}</CardTitle>
          <CardDescription>
            {data.nextUpcomingSession
              ? dictionary.schedule.noFutureReschedule
              : dictionary.schedule.noReschedule}
          </CardDescription>
        </Card>
      )}

      <Card variant="subtle">
        <CardTitle>{viewer.locale === "es" ? "Solicitar clase individual" : "Request one-time class"}</CardTitle>
        <CardDescription>
          {viewer.locale === "es"
            ? "Para reposiciones, práctica extra o una evaluación breve. Tu docente o la academia aprobará la solicitud antes de confirmar."
            : "For makeup lessons, extra practice, or a quick evaluation. Your teacher or academy will approve before confirmation."}
        </CardDescription>
        <div className="mt-4">
          <ClassRequestForm timezone={viewer.timezone} teacherTimezone={data.assignedTeacher?.user.timezone} locale={viewer.locale} />
        </div>
      </Card>

      {data.classRequests.length ? (
        <Card>
          <CardTitle>{viewer.locale === "es" ? "Solicitudes de clases individuales" : "One-time class requests"}</CardTitle>
          <CardDescription>{viewer.locale === "es" ? "Estas solicitudes aún no se convierten en clases hasta que sean aprobadas." : "These requests become classes only after approval."}</CardDescription>
          <div className="mt-3 space-y-2">
            {data.classRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{classTypeLabel(request.type, viewer.locale)}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(request.preferredStartUtc, viewer.timezone, viewer.locale)} · {request.durationMin} min</p>
                  {request.studentMessage ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
                  {request.status === ClassRequestStatus.REJECTED && request.rejectionReason ? (
                    <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {viewer.locale === "es" ? "Motivo de rechazo" : "Rejection reason"}: {request.rejectionReason}
                    </p>
                  ) : null}
                </div>
                <Badge variant={request.status === ClassRequestStatus.PENDING ? "warning" : "default"}>{classRequestStatusLabel(request.status, viewer.locale)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.pendingRequests.length ? (
        <Card variant="subtle">
          <CardTitle>{dictionary.schedule.pendingRequests}</CardTitle>
          <CardDescription>{dictionary.schedule.pendingDescription}</CardDescription>
          <div className="mt-3 space-y-2">
            {data.pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm">{formatDateTimeInZone(request.proposedStartUtc, viewer.timezone, viewer.locale)}</p>
                  {request.studentMessage ? <p className="text-xs text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
                </div>
                <Badge variant="warning">{dictionary.schedule.pendingApproval}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}

function ScheduleLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition duration-200 ease-out focus:ring-2 focus:ring-[var(--focus-ring)] focus:outline-none ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[0_8px_20px_rgba(135,83,29,0.08)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-ink-soft)] hover:-translate-y-0.5 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </Link>
  );
}

function scheduleWeekHref(date: Date, timezone: string) {
  const weekKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return `/schedule?week=${weekKey}`;
}
