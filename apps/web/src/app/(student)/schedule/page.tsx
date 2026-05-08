import { Role } from "@prisma/client";
import Link from "next/link";

import { RescheduleWidget } from "@/components/schedule/reschedule-widget";
import { WeeklyCalendar } from "@/components/schedule/weekly-calendar";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentScheduleData } from "@/lib/data";
import { formatDateTimeInZone, getDictionary } from "@/lib/i18n";

type StudentSchedulePageProps = {
  searchParams?: Promise<{ week?: string }> | { week?: string };
};

export default async function StudentSchedulePage({ searchParams }: StudentSchedulePageProps) {
  const viewer = await requireViewer([Role.STUDENT]);
  const dictionary = getDictionary(viewer.locale);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getStudentScheduleData(viewer, { week: resolvedSearchParams.week });
  const reschedulableSession = data.sessions.find((session) => session.startsAtUtc >= new Date()) ?? null;
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

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{dictionary.schedule.weeklyCalendar}</CardTitle>
            <CardDescription>{dictionary.schedule.assignedOnly}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="rounded-full border border-[var(--color-border)] bg-white/74 px-3 py-1.5 text-xs text-[var(--color-ink-soft)]">
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
          <WeeklyCalendar timezone={viewer.timezone} sessions={data.sessions} slots={data.slots} weekStartUtc={data.week.startUtc} locale={viewer.locale} />
        </div>
      </Card>

      {!data.sessions.length && data.nextUpcomingSession ? (
        <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{dictionary.schedule.noClassesWeek}</CardTitle>
            <CardDescription>
              {dictionary.schedule.nextClassScheduled} {formatDateTimeInZone(data.nextUpcomingSession.startsAtUtc, viewer.timezone, viewer.locale)}.
            </CardDescription>
          </div>
          {nextUpcomingWeekHref ? (
            <Link
              href={nextUpcomingWeekHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-gold)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--color-gold-deep)]"
            >
              {dictionary.schedule.goNextClass}
            </Link>
          ) : null}
        </Card>
      ) : null}

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
        <Card>
          <CardTitle>{data.sessions.length ? dictionary.schedule.noFutureReschedule : dictionary.schedule.noReschedule}</CardTitle>
          <CardDescription>
            {data.nextUpcomingSession
              ? dictionary.schedule.noFutureReschedule
              : dictionary.schedule.noReschedule}
          </CardDescription>
        </Card>
      )}

      {data.pendingRequests.length ? (
        <Card>
          <CardTitle>{dictionary.schedule.pendingRequests}</CardTitle>
          <CardDescription>{dictionary.schedule.pendingDescription}</CardDescription>
          <div className="mt-3 space-y-2">
            {data.pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
      className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]"
          : "border-[var(--color-border)] bg-white/74 text-[var(--color-ink-soft)] hover:bg-white hover:text-[var(--color-ink)]"
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
