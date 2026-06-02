import Link from "next/link";
import { Role, SessionStatus } from "@prisma/client";

import { ClassInProgressCard } from "@/components/classes/class-in-progress-card";
import { JoinClassButton } from "@/components/classes/join-class-button";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { MetricCard } from "@/components/dashboard/metric-card";
import { requireViewer } from "@/features/auth/server";
import { getStudentDashboardData } from "@/lib/data";
import { planLabel } from "@/lib/billing/manual-plans";
import { formatDate, formatDateTimeInZone, getDictionary } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import { studentLevelLabel } from "@/lib/student-levels";
import { buildWhatsAppPlanLink } from "@/lib/whatsapp";

export default async function StudentDashboardPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const dictionary = getDictionary(viewer.locale);
  const data = await getStudentDashboardData(viewer);

  const teacher = data.student?.assignment?.teacher;

  return (
    <AppShell role={viewer.role} activePath="/dashboard" userName={viewer.name} locale={viewer.locale}>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
        <PageIntro
          eyebrow={dictionary.student.dashboardEyebrow}
          title={dictionary.student.dashboardTitle}
          description={dictionary.student.dashboardDescription}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-2.5 py-1.5 shadow-[0_8px_20px_rgba(78,55,30,0.035)]">
              <Avatar
                src={viewer.image}
                alt={viewer.name}
                fallback={viewer.name.slice(0, 1).toUpperCase()}
                className="h-7 w-7 text-[10px]"
                locale={viewer.locale}
              />
              <span className="max-w-[180px] truncate text-xs font-medium text-[var(--color-ink-soft)]">{viewer.name}</span>
            </div>
            {data.upcomingClass ? <Badge variant="gold">{dictionary.student.nextClass}: {formatDateTimeInZone(data.upcomingClass.startsAtUtc, viewer.timezone, viewer.locale)}</Badge> : null}
            {teacher ? <Badge variant="default">{dictionary.student.assignedTeacher}: {teacher.user.name}</Badge> : null}
          </div>
        </PageIntro>

        <Card variant="interactive" density="compact" className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-gold),transparent)] opacity-70" />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-gold-deep)]">{dictionary.student.nextClass}</p>
          {data.upcomingClass ? (
            <>
              <p className="mt-3 break-words font-display text-[2rem] leading-none tracking-[-0.055em] text-[var(--color-ink)] sm:text-[2.4rem]">{formatDateTimeInZone(data.upcomingClass.startsAtUtc, viewer.timezone, viewer.locale)}</p>
              <p className="mt-3 rounded-[1.15rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-sm leading-6 text-[var(--color-ink-soft)]">{data.upcomingClass.lessonFocus ?? dictionary.student.personalizedSession}</p>
              {isClassInProgress(data.upcomingClass) ? (
                <ClassInProgressCard
                  compact
                  startedAt={data.upcomingClass.startedAt!.toISOString()}
                  startsAtUtc={data.upcomingClass.startsAtUtc.toISOString()}
                  endsAtUtc={data.upcomingClass.endsAtUtc.toISOString()}
                  locale={viewer.locale}
                />
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <JoinClassButton
                  classId={data.upcomingClass.id}
                  meetingUrl={data.upcomingClass.meetingUrl}
                  locale={viewer.locale}
                  label={dictionary.common.joinClass}
                  teacherCanStart={false}
                  variant="gold"
                />
                <Link href="/schedule">
                  <Button variant="outline">{dictionary.common.reschedule}</Button>
                </Link>
              </div>
            </>
          ) : (
            <CardDescription className="mt-3">{dictionary.student.noClassWeek}</CardDescription>
          )}
        </Card>
      </div>

      <div className="card-grid">
        <MetricCard
          title={dictionary.student.currentPlan}
          value={data.activeSubscription ? planLabel({ monthlyClassCount: data.activeSubscription.monthlyClassLimit }, viewer.locale) : dictionary.admin.noActivePlan}
          subtitle={dictionary.student.planSubtitle}
        />
        <MetricCard title={dictionary.student.remainingClasses} value={`${data.remainingClasses}`} subtitle={`${data.usedClasses} ${dictionary.student.usedThisMonth}`} />
        <MetricCard title={dictionary.student.currentLevel} value={studentLevelLabel(data.progress?.level, viewer.locale)} subtitle={dictionary.student.updatedByTeacher} />
      </div>

      <div className="grid gap-4">
        <Card variant="subtle" density="compact">
          <CardTitle>{dictionary.student.assignedTeacher}</CardTitle>
          {teacher ? (
            <div className="mt-4 flex items-center gap-3">
              <Avatar src={teacher.user.image} alt={teacher.user.name} fallback={teacher.user.name.slice(0, 1)} locale={viewer.locale} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{teacher.user.name}</p>
                <p className="text-sm text-[var(--color-ink-soft)]">{instrumentLabel(teacher.specialty, viewer.locale)}</p>
              </div>
            </div>
          ) : (
            <CardDescription className="mt-3">{dictionary.student.noTeacher}</CardDescription>
          )}
          {data.latestCompleted?.lessonNote?.studentVisibleNote || data.latestCompleted?.lastClassNotes ? (
            <div className="mt-5 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">{dictionary.student.lastNote}</p>
              <p className="mt-2 text-sm leading-6">{data.latestCompleted.lessonNote?.studentVisibleNote ?? data.latestCompleted.lastClassNotes}</p>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="subtle" density="compact">
          <CardTitle>{dictionary.student.songsLearned}</CardTitle>
          <div className="mt-4 space-y-2">
            {data.songs.map((song) => (
              <div key={song.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{song.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{song.artist}</p>
                </div>
                <Badge variant="gold">{dictionary.common.completed}</Badge>
              </div>
            ))}
            {!data.songs.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.student.noSongs}</p> : null}
          </div>
        </Card>

        <Card variant="subtle" density="compact">
          <CardTitle>{dictionary.student.upcomingGoals}</CardTitle>
          <div className="mt-4 space-y-2">
            {data.goals.map((goal) => (
              <div key={goal.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-4 py-3">
                <p className="text-sm font-medium">{goal.title}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.student.goal}: {formatDate(goal.targetDate, viewer.locale)}</p>
              </div>
            ))}
            {!data.goals.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.student.noGoals}</p> : null}
          </div>
        </Card>
      </div>

      <Card variant="inset" className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <CardTitle>{dictionary.common.managePlan}</CardTitle>
          <CardDescription>{dictionary.student.planHelp}</CardDescription>
        </div>
        <a href={buildWhatsAppPlanLink()} target="_blank" rel="noreferrer">
          <Button variant="gold">{dictionary.common.openWhatsApp}</Button>
        </a>
      </Card>
    </AppShell>
  );
}

function isClassInProgress(session: { startedAt?: Date | null; status: SessionStatus }) {
  return Boolean(session.startedAt) && session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.NO_SHOW && session.status !== SessionStatus.CANCELLED;
}
