import Link from "next/link";
import { Role } from "@prisma/client";

import { LessonNoteForm, PracticeAssignmentForm, RepertoireAttachmentForm, RepertoireForm } from "@/components/progress/progress-forms";
import { RecurringClassForm } from "@/components/teacher/recurring-class-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherProgressData } from "@/lib/data";
import { formatDate, formatDateTimeInZone } from "@/lib/i18n";
import { instrumentLabel, instrumentToSkillInstrument } from "@/lib/instruments";

type PageProps = { searchParams?: Promise<{ studentId?: string }> };

export default async function TeacherProgressPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const params = await searchParams;
  const data = await getTeacherProgressData(viewer, { studentId: params?.studentId });
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/progress" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.selectedStudentId}>
      <PageIntro
        eyebrow={isSpanish ? "Inteligencia de progreso" : "Progress intelligence"}
        title={isSpanish ? "Convierte cada clase en evidencia de avance." : "Turn every lesson into progress evidence."}
        description={isSpanish ? "Registra notas estructuradas, habilidades, repertorio, tareas y reportes sin romper tu flujo docente." : "Capture structured notes, skills, repertoire, assignments, and reports without breaking your teaching flow."}
      />

      {!data.selected ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.students.map((item) => (
            <Card key={item.assignmentId}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={item.student.user.image} alt={item.student.user.name} fallback={item.student.user.name.slice(0, 1)} />
                  <div>
                    <CardTitle>{item.student.user.name}</CardTitle>
                    <CardDescription>{instrumentLabel(item.student.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")}</CardDescription>
                  </div>
                </div>
                <Link href={`/teacher/progress?studentId=${item.student.id}`}><Button size="sm" variant="outline">{isSpanish ? "Abrir" : "Open"}</Button></Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Metric label={isSpanish ? "Notas faltantes" : "Missing notes"} value={"missingNotes" in item ? item.missingNotes : 0} />
                <Metric label={isSpanish ? "Tareas activas" : "Active assignments"} value={"activeAssignments" in item ? item.activeAssignments : 0} />
                <Metric label={isSpanish ? "Min recientes" : "Recent min"} value={"recentPracticeMinutes" in item ? item.recentPracticeMinutes : 0} />
                <Metric label={isSpanish ? "Videos" : "Videos"} value={"recentVideos" in item ? item.recentVideos : 0} />
              </div>
            </Card>
          ))}
          {!data.students.length ? <Card><CardDescription>{isSpanish ? "No tienes estudiantes asignados." : "You do not have assigned students."}</CardDescription></Card> : null}
        </div>
      ) : (
        <SelectedStudentProgress data={{ ...data, selected: data.selected }} viewer={viewer} isSpanish={isSpanish} />
      )}
    </AppShell>
  );
}

function SelectedStudentProgress({
  data,
  viewer,
  isSpanish,
}: {
  data: Awaited<ReturnType<typeof getTeacherProgressData>> & { selected: NonNullable<Awaited<ReturnType<typeof getTeacherProgressData>>["selected"]> };
  viewer: Awaited<ReturnType<typeof requireViewer>>;
  isSpanish: boolean;
}) {
  return (
        <div className="space-y-4 min-w-0">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={data.selected.user.image} alt={data.selected.user.name} fallback={data.selected.user.name.slice(0, 1)} />
                <div className="min-w-0">
                  <CardTitle>{data.selected.user.name}</CardTitle>
                  <CardDescription>{instrumentLabel(data.selected.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")} · {data.selected.user.timezone}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/teacher/progress/reports/new?studentId=${data.selected.id}`}><Button variant="gold" size="sm">{isSpanish ? "Generar reporte" : "Generate report"}</Button></Link>
                <Link href="/teacher/progress"><Button variant="outline" size="sm">{isSpanish ? "Ver todos" : "All students"}</Button></Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label={isSpanish ? "Repertorio" : "Repertoire"} value={data.selected.repertoireItems.length} />
              <Metric label={isSpanish ? "Tareas" : "Assignments"} value={data.selected.practiceAssignments.length} />
              <Metric label={isSpanish ? "Prácticas" : "Practice logs"} value={data.selected.practiceLogs.length} />
              <Metric label={isSpanish ? "Reportes" : "Reports"} value={data.selected.progressReports.length} />
            </div>
          </Card>

          <div className="grid min-w-0 gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="min-w-0 overflow-hidden">
              <CardTitle>{isSpanish ? "Notas de clase" : "Lesson notes"}</CardTitle>
              <CardDescription>{isSpanish ? "Abre una clase y registra evidencia estructurada." : "Open a class and capture structured evidence."}</CardDescription>
              <div className="mt-4 space-y-4">
                {data.selected.sessions.map((session) => (
                  <details key={session.id} className="min-w-0 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-4" open={!session.lessonNote}>
                    <summary className="cursor-pointer break-words text-sm font-semibold">
                      {formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale)} · {session.lessonFocus ?? (isSpanish ? "Clase" : "Lesson")}
                      {!session.lessonNote ? <Badge className="ml-2">{isSpanish ? "Falta nota" : "Missing note"}</Badge> : null}
                    </summary>
                    <div className="mt-3">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Link href={`/teacher/classes/${session.id}/complete`}>
                          <Button size="sm" variant="gold">{isSpanish ? "Completar / actualizar clase" : "Complete / update class"}</Button>
                        </Link>
                      </div>
                      <LessonNoteForm
                        sessionId={session.id}
                        initial={session.lessonNote}
                        skillCategories={skillCategoriesForInstrument(data.skillCategories, session.instrument ?? data.selected.preferredInstrument)}
                        locale={viewer.locale}
                      />
                      {session.lessonNote ? (
                        <div className="mt-3">
                          <PracticeAssignmentForm
                            studentId={data.selected.id}
                            lessonNoteId={session.lessonNote.id}
                            classSessionId={session.id}
                            repertoire={data.selected.repertoireItems}
                            skills={skillCategoriesForInstrument(data.skillCategories, session.instrument ?? data.selected.preferredInstrument)}
                            locale={viewer.locale}
                          />
                        </div>
                      ) : null}
                    </div>
                  </details>
                ))}
                {!data.selected.sessions.length ? <CardDescription>{isSpanish ? "Aún no hay clases para documentar." : "No classes to document yet."}</CardDescription> : null}
              </div>
            </Card>

            <div className="min-w-0 space-y-4">
              <Card className="overflow-hidden">
                <CardTitle>{isSpanish ? "Repertorio" : "Repertoire"}</CardTitle>
                <div className="mt-3 space-y-2">
                  {data.selected.repertoireItems.map((item) => (
                    <div key={item.id} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                      <p className="break-words text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{item.status} · {item.masteryPercent}% · {item.currentFocusSection ?? "-"}</p>
                      <RepertoireAttachmentForm
                        repertoireItemId={item.id}
                        locale={viewer.locale}
                        attachments={item.attachments.map((attachment) => ({
                          id: attachment.id,
                          originalName: attachment.originalName,
                          sizeBytes: attachment.sizeBytes,
                          url: `/api/media/repertoire-attachments/${attachment.id}`,
                        }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4"><RepertoireForm studentId={data.selected.id} locale={viewer.locale} /></div>
              </Card>

              <Card className="overflow-hidden">
                <CardTitle>{isSpanish ? "Configurar clases recurrentes" : "Set up recurring classes"}</CardTitle>
                <CardDescription>{isSpanish ? "Crea una serie fija para este estudiante sin salir del contexto." : "Create a fixed series for this student without leaving the context."}</CardDescription>
                <div className="mt-4">
                  <RecurringClassForm
                    students={data.students.map((assignment) => ({
                      id: assignment.student.id,
                      name: assignment.student.user.name,
                      instrument: assignment.student.preferredInstrument,
                      timezone: assignment.student.user.timezone,
                    }))}
                    defaultTimezone={data.teacher?.user.timezone ?? viewer.timezone}
                    locale={viewer.locale}
                    selectedStudentId={data.selected.id}
                  />
                </div>
              </Card>

              <Card>
                <CardTitle>{isSpanish ? "Práctica reciente" : "Recent practice"}</CardTitle>
                <div className="mt-3 space-y-2">
                  {data.selected.practiceLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm">
                      <p className="font-semibold">{log.minutesPracticed} min · {formatDate(log.practicedOn, viewer.locale)}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{log.notes ?? log.assignment?.title ?? "-"}</p>
                    </div>
                  ))}
                  {!data.selected.practiceLogs.length ? <CardDescription>{isSpanish ? "Sin registros recientes." : "No recent logs."}</CardDescription> : null}
                </div>
              </Card>

              <Card>
                <CardTitle>{isSpanish ? "Reporte de progreso" : "Progress report"}</CardTitle>
                <div className="mt-3 space-y-2">
                  {data.selected.progressReports.map((report) => (
                    <Link key={report.id} href={`/teacher/progress/reports/${report.id}`} className="block rounded-xl border border-[var(--color-border)] bg-white/70 p-3 text-sm transition hover:bg-white">
                      <p className="font-semibold">{formatDate(report.startDate, viewer.locale)} - {formatDate(report.endDate, viewer.locale)}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{report.gradeLetter ?? report.finalGrade ?? report.status} · {report.teacherSummary ?? (isSpanish ? "Reporte generado" : "Generated report")}</p>
                    </Link>
                  ))}
                  {!data.selected.progressReports.length ? <CardDescription>{isSpanish ? "Aún no hay reportes." : "No reports yet."}</CardDescription> : null}
                </div>
                <div className="mt-4">
                  <Link href={`/teacher/progress/reports/new?studentId=${data.selected.id}`}><Button variant="outline" className="w-full">{isSpanish ? "Crear nuevo reporte" : "Create new report"}</Button></Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3"><p className="font-display text-3xl">{value}</p><p className="text-xs text-[var(--color-ink-soft)]">{label}</p></div>;
}

function skillCategoriesForInstrument<T extends { instrument: string }>(skills: T[], instrument?: string | null) {
  const lessonInstrument = instrumentToSkillInstrument(instrument);
  return skills.filter((skill) => skill.instrument === "GENERAL" || skill.instrument === lessonInstrument);
}
