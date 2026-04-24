import Link from "next/link";
import { Role } from "@prisma/client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminDashboard } from "@/features/admin/data";

export default async function AdminDashboardPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getAdminDashboard();

  return (
    <AppShell role={viewer.role} activePath="/admin/dashboard" userName={viewer.name}>
      <PageIntro
        eyebrow="Operación y métricas"
        title="La operación completa, con una lectura más refinada."
        description="Sigue ingresos, carga docente, actividad semanal y cancelaciones desde un panel administrativo que prioriza claridad y control."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/teachers">
            <Button variant="gold" size="sm">Agregar docente</Button>
          </Link>
          <Link href="/admin/students">
            <Button variant="outline" size="sm">Agregar estudiante</Button>
          </Link>
        </div>
      </PageIntro>

      <div className="card-grid">
        <MetricCard title="Estudiantes activos" value={`${data.totalStudents}`} />
        <MetricCard title="Docentes activos" value={`${data.totalTeachers}`} />
        <MetricCard title="MRR" value={`$${data.mrr}`} subtitle="Plan manual via WhatsApp" />
      </div>

      <Card>
        <CardTitle>Acciones rápidas</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/teachers">
            <Button variant="gold" size="sm">Gestionar docentes</Button>
          </Link>
          <Link href="/admin/students">
            <Button variant="outline" size="sm">Gestionar estudiantes</Button>
          </Link>
          <Link href="/admin/availability">
            <Button variant="outline" size="sm">Editar disponibilidad</Button>
          </Link>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Clases impartidas (7 días)</CardTitle>
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
          <CardTitle>Churn / cancelaciones (30 días)</CardTitle>
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
        <CardTitle>Ocupación de docentes</CardTitle>
        <div className="mt-3 space-y-2">
          {data.workload.map((item) => (
            <div key={item.teacherId} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.teacherName}</p>
                <p className="text-sm">{item.occupancy}%</p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{item.assignedStudents} estudiantes asignados</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Estudiantes activos</CardTitle>
        <div className="mt-3 space-y-2">
          {data.activeStudents.map((student) => (
            <div key={student.studentId} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{student.studentName}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">Docente: {student.teacherName}</p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{new Date(student.assignedAt).toLocaleDateString("es-US")}</p>
            </div>
          ))}
          {!data.activeStudents.length ? <p className="text-sm text-[var(--color-ink-soft)]">No hay estudiantes activos.</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
