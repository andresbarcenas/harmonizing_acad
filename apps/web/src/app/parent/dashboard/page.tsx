import Link from "next/link";
import { Role } from "@prisma/client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { planLabel } from "@/lib/billing/manual-plans";
import { getStudentDashboardDataForProfile } from "@/lib/data";
import { formatDate, formatDateTimeInZone, getDictionary } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import { resolveParentStudentSelection } from "@/lib/parents";
import { studentLevelLabel } from "@/lib/student-levels";

export default async function ParentDashboardPage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const dictionary = getDictionary(viewer.locale);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const selectedStudentId = selection.selectedStudentId;
  const isSpanish = viewer.locale === "es";

  if (!selectedStudentId) {
    return (
      <AppShell role={viewer.role} activePath="/parent/dashboard" userName={viewer.name} locale={viewer.locale}>
        <PageIntro eyebrow={isSpanish ? "Portal familiar" : "Family portal"} title={isSpanish ? "Aún no hay estudiantes vinculados." : "No linked students yet."} description={isSpanish ? "Administración puede vincular estudiantes a esta cuenta familiar." : "An admin can link students to this family account."} />
      </AppShell>
    );
  }

  const data = await getStudentDashboardDataForProfile(selectedStudentId);
  const student = data.student;
  const teacher = student?.assignment?.teacher;
  const studentTimezone = student?.user.timezone ?? viewer.timezone;

  return (
    <AppShell role={viewer.role} activePath="/parent/dashboard" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selectedStudentId}>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
        <PageIntro
          eyebrow={isSpanish ? "Portal familiar" : "Family portal"}
          title={isSpanish ? `Resumen de ${student?.user.name ?? "estudiante"}` : `${student?.user.name ?? "Student"} at a glance`}
          description={isSpanish ? "Agenda, progreso, tareas, facturas y comunicación para el estudiante seleccionado." : "Schedule, progress, practice, invoices, and communication for the selected student."}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            {student ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-2.5 py-1.5 shadow-[0_8px_20px_rgba(78,55,30,0.035)]">
                <Avatar src={student.user.image} alt={student.user.name} fallback={student.user.name.slice(0, 1).toUpperCase()} className="h-7 w-7 text-[10px]" locale={viewer.locale} />
                <span className="max-w-[180px] truncate text-xs font-medium text-[var(--color-ink-soft)]">{student.user.name}</span>
              </div>
            ) : null}
            {data.upcomingClass ? <Badge variant="gold">{dictionary.student.nextClass}: {formatDateTimeInZone(data.upcomingClass.startsAtUtc, studentTimezone, viewer.locale)}</Badge> : null}
            {teacher ? <Badge variant="default">{dictionary.student.assignedTeacher}: {teacher.user.name}</Badge> : null}
          </div>
        </PageIntro>

        <Card variant="interactive" density="compact" className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-gold),transparent)] opacity-70" />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-gold-deep)]">{dictionary.student.nextClass}</p>
          {data.upcomingClass ? (
            <>
              <p className="mt-3 break-words font-display text-[2rem] leading-none tracking-[-0.055em] text-[var(--color-ink)] sm:text-[2.4rem]">{formatDateTimeInZone(data.upcomingClass.startsAtUtc, studentTimezone, viewer.locale)}</p>
              <p className="mt-3 rounded-[1.15rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-sm leading-6 text-[var(--color-ink-soft)]">{data.upcomingClass.lessonFocus ?? dictionary.student.personalizedSession}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={data.upcomingClass.meetingUrl} target="_blank" rel="noreferrer"><Button variant="gold">{dictionary.common.joinClass}</Button></a>
                <Link href={`/parent/schedule?studentId=${selectedStudentId}`}><Button variant="outline">{dictionary.common.reschedule}</Button></Link>
              </div>
            </>
          ) : (
            <CardDescription className="mt-3">{dictionary.student.noClassWeek}</CardDescription>
          )}
        </Card>
      </div>

      <div className="card-grid">
        <MetricCard title={dictionary.student.currentPlan} value={data.activeSubscription ? planLabel({ monthlyClassCount: data.activeSubscription.monthlyClassLimit }, viewer.locale) : dictionary.admin.noActivePlan} subtitle={dictionary.student.planSubtitle} />
        <MetricCard title={dictionary.student.remainingClasses} value={`${data.remainingClasses}`} subtitle={`${data.usedClasses} ${dictionary.student.usedThisMonth}`} />
        <MetricCard title={dictionary.student.currentLevel} value={studentLevelLabel(data.progress?.level, viewer.locale)} subtitle={dictionary.student.updatedByTeacher} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
          ) : <CardDescription className="mt-3">{dictionary.student.noTeacher}</CardDescription>}
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
    </AppShell>
  );
}
