import Link from "next/link";
import { Role } from "@prisma/client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminDashboardData } from "@/lib/data";
import { formatDate, getDictionary } from "@/lib/i18n";

export default async function AdminDashboardPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell role={viewer.role} activePath="/admin/dashboard" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.admin.dashboardEyebrow}
        title={dictionary.admin.dashboardTitle}
        description={dictionary.admin.dashboardDescription}
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/teachers">
            <Button variant="gold" size="sm">{dictionary.admin.addTeacher}</Button>
          </Link>
          <Link href="/admin/students">
            <Button variant="outline" size="sm">{dictionary.admin.addStudent}</Button>
          </Link>
        </div>
      </PageIntro>

      <div className="card-grid">
        <MetricCard title={dictionary.admin.activeStudents} value={`${data.totalStudents}`} />
        <MetricCard title={dictionary.admin.activeTeachers} value={`${data.totalTeachers}`} />
        <MetricCard title="MRR" value={`$${data.mrr}`} subtitle={dictionary.admin.mrrSubtitle} />
      </div>

      <Card>
        <CardTitle>{dictionary.admin.quickActions}</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/teachers">
            <Button variant="gold" size="sm">{dictionary.admin.manageTeachers}</Button>
          </Link>
          <Link href="/admin/students">
            <Button variant="outline" size="sm">{dictionary.admin.manageStudents}</Button>
          </Link>
          <Link href="/admin/availability">
            <Button variant="outline" size="sm">{dictionary.admin.editAvailability}</Button>
          </Link>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>{dictionary.admin.classesWeek}</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em] sm:text-5xl">{data.classesWeek}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.weeklyClassesTrend.map((point) => (
              <div key={point.key} className="rounded-xl border border-[var(--color-border)] bg-white/70 px-2 py-2 text-center">
                <p className="text-[11px] text-[var(--color-ink-soft)]">{point.key}</p>
                <p className="font-semibold">{point.count}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>{dictionary.admin.churn}</CardTitle>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em] sm:text-5xl">{data.cancelledCount}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.churnTrend.map((point) => (
              <div key={point.key} className="rounded-xl border border-[var(--color-border)] bg-white/70 px-2 py-2 text-center">
                <p className="text-[11px] text-[var(--color-ink-soft)]">{point.key}</p>
                <p className="font-semibold">{point.count}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{dictionary.admin.teacherOccupancy}</CardTitle>
        <div className="mt-3 space-y-2">
          {data.workload.map((item) => (
            <div key={item.teacherId} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.teacherName}</p>
                <p className="text-sm">{item.occupancy}%</p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{item.assignedStudents} {dictionary.admin.assignedStudents}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>{dictionary.admin.activeStudents}</CardTitle>
        <div className="mt-3 space-y-2">
          {data.activeStudents.map((student) => (
            <div key={student.studentId} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{student.studentName}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.common.teacher}: {student.teacherName}</p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(student.assignedAt, viewer.locale)}</p>
            </div>
          ))}
          {!data.activeStudents.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.admin.noActiveStudents}</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
