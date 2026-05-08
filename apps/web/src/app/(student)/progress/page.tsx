import { Role } from "@prisma/client";

import { AssignmentStatusActions, PracticeLogForm } from "@/components/progress/progress-forms";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentProgressData } from "@/lib/data";
import { formatDate, formatDateTimeInZone } from "@/lib/i18n";

export default async function StudentProgressPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentProgressData(viewer);
  const isSpanish = viewer.locale === "es";
  const student = data.student;

  return (
    <AppShell role={viewer.role} activePath="/progress" userName={viewer.name} locale={viewer.locale}>
      <PageIntro eyebrow={isSpanish ? "Progreso musical" : "Musical progress"} title={isSpanish ? "Tu práctica empieza a contar una historia." : "Your practice starts telling a story."} description={isSpanish ? "Consulta tareas, repertorio, notas visibles y reportes de avance en un solo lugar." : "Review assignments, repertoire, visible notes, and progress reports in one place."} />
      {!student ? <Card><CardDescription>{isSpanish ? "No encontramos tu perfil." : "We could not find your profile."}</CardDescription></Card> : (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <Card>
              <CardTitle>{isSpanish ? "Tareas de práctica" : "Practice assignments"}</CardTitle>
              <div className="mt-3 space-y-2">
                {student.practiceAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{assignment.title}</p>
                        <p className="text-xs text-[var(--color-ink-soft)]">{assignment.instructions}</p>
                        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{assignment.repertoireItem?.title ?? assignment.skillCategory?.name ?? ""}</p>
                      </div>
                      <Badge>{assignment.status}</Badge>
                    </div>
                    <div className="mt-2"><AssignmentStatusActions assignmentId={assignment.id} status={assignment.status} locale={viewer.locale} /></div>
                  </div>
                ))}
                {!student.practiceAssignments.length ? <CardDescription>{isSpanish ? "No tienes tareas asignadas todavía." : "No assignments yet."}</CardDescription> : null}
              </div>
            </Card>

            <Card>
              <CardTitle>{isSpanish ? "Registrar práctica" : "Log practice"}</CardTitle>
              <PracticeLogForm assignments={student.practiceAssignments} repertoire={student.repertoireItems} skills={data.skillCategories} locale={viewer.locale} />
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardTitle>{isSpanish ? "Repertorio activo" : "Active repertoire"}</CardTitle>
              <div className="mt-3 space-y-2">
                {student.repertoireItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{item.composerOrArtist ?? ""} · {item.status} · {item.masteryPercent}%</p>
                    {item.studentVisibleNotes ? <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{item.studentVisibleNotes}</p> : null}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>{isSpanish ? "Notas visibles de clase" : "Visible lesson notes"}</CardTitle>
              <div className="mt-3 space-y-2">
                {student.sessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                    <p className="text-sm font-semibold">{formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale)}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{session.lessonNote?.studentVisibleNote ?? session.lessonNote?.summary}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>{isSpanish ? "Reportes" : "Reports"}</CardTitle>
              <div className="mt-3 space-y-2">
                {student.progressReports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                    <p className="text-sm font-semibold">{formatDate(report.startDate, viewer.locale)} - {formatDate(report.endDate, viewer.locale)}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{report.teacherSummary ?? (isSpanish ? "Reporte generado" : "Generated report")}</p>
                    <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Minutos de práctica" : "Practice minutes"}: {report.totalPracticeMinutes}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
