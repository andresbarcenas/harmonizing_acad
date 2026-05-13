import { Role, SessionStatus } from "@prisma/client";

import { SeriesActions } from "@/components/teacher/series-actions";
import { RecurringClassForm } from "@/components/teacher/recurring-class-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherDashboardData } from "@/lib/data";
import { formatDateTimeInZone, getDictionary } from "@/lib/i18n";

const dayNames = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
} as const;

type TeacherDashboardPageProps = {
  searchParams?: Promise<{
    studentId?: string;
  }>;
};

export default async function TeacherDashboardPage({ searchParams }: TeacherDashboardPageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const dictionary = getDictionary(viewer.locale);
  const resolvedSearchParams = await searchParams;
  const data = await getTeacherDashboardData(viewer, { studentId: resolvedSearchParams?.studentId });

  return (
    <AppShell role={viewer.role} activePath="/teacher/dashboard" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.selectedStudentId}>
      <PageIntro
        eyebrow={dictionary.teacher.dashboardEyebrow}
        title={dictionary.teacher.dashboardTitle}
        description={dictionary.teacher.dashboardDescription}
      />

      <div className="card-grid">
        <Card>
          <CardTitle>{dictionary.teacher.classesToday}</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">{data.classesToday.length}</p>
        </Card>
        <Card>
          <CardTitle>{dictionary.teacher.assignedStudents}</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">{data.students.length}</p>
        </Card>
        <Card>
          <CardTitle>{dictionary.teacher.pendingRequests}</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">{data.pendingRequests.length}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{dictionary.teacher.recurringTitle}</CardTitle>
            <CardDescription>
              {dictionary.teacher.recurringDescription}
            </CardDescription>
          </div>
          <a href={withStudentContext("/teacher/schedule", data.selectedStudentId)}>
            <Button size="sm" variant="outline">{viewer.locale === "es" ? "Agendar clase individual" : "Book one-time class"}</Button>
          </a>
        </div>
        <div className="mt-4">
          <RecurringClassForm
            students={data.students.map((assignment) => ({
              id: assignment.student.id,
              name: assignment.student.user.name,
              instrument: assignment.student.preferredInstrument,
              timezone: assignment.student.user.timezone,
            }))}
            defaultTimezone={viewer.timezone}
            defaultMeetingUrl={data.teacher?.zoomLink ?? data.teacher?.meetLink ?? ""}
            locale={viewer.locale}
            selectedStudentId={data.selectedStudentId}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>{dictionary.teacher.seriesTitle}</CardTitle>
        <CardDescription>{dictionary.teacher.seriesDescription}</CardDescription>
        <div className="mt-3 space-y-2">
          {data.recurringSeries.map((series) => (
            <div key={series.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{series.student.user.name}</p>
                <Badge variant={series.active ? "gold" : "default"}>{series.active ? dictionary.common.active : dictionary.common.stopped}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                {series.weekdays.map((day) => dayNames[viewer.locale][day] ?? day).join(", ")} · {series.startTimeLocal} · {viewer.locale === "es" ? "cada" : "every"} {series.intervalWeeks} {viewer.locale === "es" ? "semana(s)" : "week(s)"}
              </p>
              <p className="text-xs text-[var(--color-ink-soft)]">
                {viewer.locale === "es" ? "Próximas clases" : "Upcoming classes"}: {series.sessions.length} · {dictionary.common.timezone}: {series.timezone}
              </p>
              <p className="text-xs text-[var(--color-ink-soft)]">
                {viewer.locale === "es" ? "Modo" : "Mode"}: {recurringTimezoneModeLabel(series.timezoneMode, viewer.locale)}
              </p>
              <SeriesActions seriesId={series.id} isActive={series.active} locale={viewer.locale} />
            </div>
          ))}
          {!data.recurringSeries.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">{viewer.locale === "es" ? "No hay series recurrentes creadas." : "No recurring series created."}</p>
          ) : null}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle>{dictionary.teacher.todayAgenda}</CardTitle>
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
                  {dictionary.teacher.teacherTime}: {formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale)} ({viewer.timezone})
                </p>
                <p className="text-[11px] text-[var(--color-ink-soft)]">
                  {dictionary.teacher.studentTime}: {formatDateTimeInZone(session.startsAtUtc, session.student.user.timezone, viewer.locale)} ({session.student.user.timezone})
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={session.meetingUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="gold">{dictionary.common.joinClass}</Button>
                  </a>
                  <a href={withStudentContext("/teacher/requests", data.selectedStudentId)}>
                    <Button size="sm" variant="outline">{dictionary.teacher.viewRequests}</Button>
                  </a>
                  <a href={`/teacher/classes/${session.id}/complete`}>
                    <Button size="sm" variant="outline">{viewer.locale === "es" ? "Completar clase" : "Complete class"}</Button>
                  </a>
                </div>
              </div>
            ))}
            {!data.classesToday.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.teacher.noClassesToday}</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{dictionary.teacher.videosToReview}</CardTitle>
          <CardDescription>{dictionary.teacher.videosDescription}</CardDescription>
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
            {!data.pendingVideos.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.teacher.noPendingVideos}</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{dictionary.teacher.assignedList}</CardTitle>
          <CardDescription>{dictionary.teacher.assignedDescription}</CardDescription>
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
                <p className="text-xs text-[var(--color-ink-soft)]">{assignment.student.preferredInstrument ?? (viewer.locale === "es" ? "Música general" : "General music")}</p>
              </div>
            ))}
            {!data.students.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.teacher.noAssigned}</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle>{dictionary.teacher.recentRequests}</CardTitle>
          <a href={withStudentContext("/teacher/requests", data.selectedStudentId)}>
            <Button size="sm" variant="outline">{dictionary.teacher.openInbox}</Button>
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
              <p className="text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(request.proposedStartUtc, viewer.timezone, viewer.locale)}</p>
              <p className="text-[11px] text-[var(--color-ink-soft)]">
                {dictionary.teacher.teacherTime}: {formatDateTimeInZone(request.proposedStartUtc, viewer.timezone, viewer.locale)} ({viewer.timezone})
              </p>
              <p className="text-[11px] text-[var(--color-ink-soft)]">
                {dictionary.teacher.studentTime}: {formatDateTimeInZone(request.proposedStartUtc, request.session.student.user.timezone, viewer.locale)} ({request.session.student.user.timezone})
              </p>
              {request.studentMessage ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
            </div>
          ))}
          {!data.pendingRequests.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.teacher.noRequests}</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}

function withStudentContext(href: string, studentId?: string | null) {
  return studentId ? `${href}?studentId=${encodeURIComponent(studentId)}` : href;
}

function recurringTimezoneModeLabel(mode: string | null | undefined, locale: "en" | "es") {
  if (mode === "TEACHER_TIME") return locale === "es" ? "hora docente" : "teacher time";
  if (mode === "CUSTOM_TIMEZONE") return locale === "es" ? "zona personalizada" : "custom timezone";
  return locale === "es" ? "hora del estudiante" : "student time";
}
