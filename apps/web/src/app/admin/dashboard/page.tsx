import { Role } from "@prisma/client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { getAdminDashboard } from "@/features/admin/data";

export default async function AdminDashboardPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getAdminDashboard();

  return (
    <AppShell role={viewer.role} activePath="/admin/dashboard" userName={viewer.name}>
      <div className="card-grid">
        <MetricCard title="Estudiantes activos" value={`${data.totalStudents}`} />
        <MetricCard title="Docentes activos" value={`${data.totalTeachers}`} />
        <MetricCard title="MRR" value={`$${data.mrr}`} subtitle="Plan manual via WhatsApp" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Clases impartidas (7 días)</CardTitle>
          <p className="mt-2 text-3xl font-semibold">{data.classesWeek}</p>
        </Card>
        <Card>
          <CardTitle>Churn / cancelaciones (30 días)</CardTitle>
          <p className="mt-2 text-3xl font-semibold">{data.cancelledCount}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Ocupación de docentes</CardTitle>
        <div className="mt-3 space-y-2">
          {data.workload.map((item) => (
            <div key={item.teacherId} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.teacherName}</p>
                <p className="text-sm">{item.occupancy}%</p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{item.assignedStudents} estudiantes asignados</p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
