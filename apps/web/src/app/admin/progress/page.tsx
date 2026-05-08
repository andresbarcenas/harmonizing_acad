import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminProgressData } from "@/lib/data";
import { formatDate, formatDateTimeInZone } from "@/lib/i18n";

export default async function AdminProgressPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getAdminProgressData(viewer);
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/progress" userName={viewer.name} locale={viewer.locale}>
      <PageIntro eyebrow={isSpanish ? "Visibilidad académica" : "Academic visibility"} title={isSpanish ? "Detecta huecos antes de que se vuelvan operación manual." : "Spot gaps before they become manual operations."} description={isSpanish ? "Monitorea notas faltantes, baja práctica, reportes y categorías de habilidad desde la administración." : "Monitor missing notes, low practice, reports, and skill categories from admin."} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>{isSpanish ? "Notas de clase faltantes" : "Missing lesson notes"}</CardTitle>
          <div className="mt-3 space-y-2">
            {data.missingLessonNotes.map((session) => (
              <div key={session.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
                <p className="font-semibold">{session.student.user.name} · {session.teacher.user.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale)} · {session.lessonFocus ?? "-"}</p>
              </div>
            ))}
            {!data.missingLessonNotes.length ? <CardDescription>{isSpanish ? "Todas las clases completadas tienen nota." : "All completed lessons have notes."}</CardDescription> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Baja actividad de práctica" : "Low practice activity"}</CardTitle>
          <div className="mt-3 space-y-2">
            {data.lowPracticeStudents.map((item) => (
              <div key={item.student.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
                <p className="font-semibold">{item.student.user.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{item.minutes} {isSpanish ? "minutos en 14 días" : "minutes in 14 days"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Reportes recientes" : "Recent reports"}</CardTitle>
          <div className="mt-3 space-y-2">
            {data.reports.map((report) => (
              <div key={report.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{report.student.user.name}</p>
                  <Badge>{report.status}</Badge>
                </div>
                <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(report.startDate, viewer.locale)} - {formatDate(report.endDate, viewer.locale)} · {report.totalPracticeMinutes} min</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Categorías de habilidad" : "Skill categories"}</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.skillCategories.map((skill) => <Badge key={skill.id} variant={skill.active ? "gold" : "default"}>{skill.instrument} · {skill.name}</Badge>)}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
