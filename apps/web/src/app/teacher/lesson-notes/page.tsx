import Link from "next/link";
import { Role } from "@prisma/client";

import { LessonNoteForm, PracticeAssignmentForm } from "@/components/progress/progress-forms";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherProgressData } from "@/lib/data";
import { formatDateTimeInZone } from "@/lib/i18n";
import { instrumentLabel, instrumentToSkillInstrument } from "@/lib/instruments";

type PageProps = { searchParams?: Promise<{ studentId?: string }> };

export default async function TeacherLessonNotesPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const params = await searchParams;
  const data = await getTeacherProgressData(viewer, { studentId: params?.studentId });
  const isSpanish = viewer.locale === "es";
  const selected = data.selected;

  return (
    <AppShell role={viewer.role} activePath="/teacher/lesson-notes" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.selectedStudentId}>
      <PageIntro
        eyebrow={isSpanish ? "Notas de clase" : "Lesson notes"}
        title={isSpanish ? "Documenta cada clase sin perder el ritmo." : "Document each lesson without losing momentum."}
        description={isSpanish ? "Registra evidencia estructurada, habilidades observadas y tareas de práctica para tus estudiantes asignados." : "Capture structured evidence, observed skills, and practice assignments for your assigned students."}
      />

      {!selected ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.students.map((item) => (
            <Card key={item.assignmentId}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={item.student.user.image} alt={item.student.user.name} fallback={item.student.user.name.slice(0, 1)} locale={viewer.locale} />
                  <div className="min-w-0">
                    <CardTitle>{item.student.user.name}</CardTitle>
                    <CardDescription>{instrumentLabel(item.student.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")}</CardDescription>
                  </div>
                </div>
                <Link href={`/teacher/lesson-notes?studentId=${item.student.id}`}>
                  <Button size="sm" variant="outline">{isSpanish ? "Abrir" : "Open"}</Button>
                </Link>
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
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={selected.user.image} alt={selected.user.name} fallback={selected.user.name.slice(0, 1)} locale={viewer.locale} />
                <div className="min-w-0">
                  <CardTitle>{selected.user.name}</CardTitle>
                  <CardDescription>{instrumentLabel(selected.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")} · {selected.user.timezone}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/teacher/progress?studentId=${selected.id}`}><Button variant="outline" size="sm">{isSpanish ? "Progreso" : "Progress"}</Button></Link>
                <Link href={`/teacher/progress/reports?studentId=${selected.id}`}><Button variant="outline" size="sm">{isSpanish ? "Reportes" : "Reports"}</Button></Link>
                <Link href="/teacher/lesson-notes"><Button variant="outline" size="sm">{isSpanish ? "Ver todos" : "All students"}</Button></Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label={isSpanish ? "Clases recientes" : "Recent classes"} value={selected.sessions.length} />
              <Metric label={isSpanish ? "Notas faltantes" : "Missing notes"} value={selected.sessions.filter((session) => !session.lessonNote).length} />
              <Metric label={isSpanish ? "Tareas" : "Assignments"} value={selected.practiceAssignments.length} />
              <Metric label={isSpanish ? "Prácticas" : "Practice logs"} value={selected.practiceLogs.length} />
            </div>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardTitle>{isSpanish ? "Notas de clase" : "Lesson notes"}</CardTitle>
            <CardDescription>{isSpanish ? "Abre una clase y registra evidencia estructurada." : "Open a class and capture structured evidence."}</CardDescription>
            <div className="mt-4 space-y-4">
              {selected.sessions.map((session) => (
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
                      skillCategories={skillCategoriesForInstrument(data.skillCategories, session.instrument ?? selected.preferredInstrument)}
                      locale={viewer.locale}
                    />
                    {session.lessonNote ? (
                      <div className="mt-3">
                        <PracticeAssignmentForm
                          studentId={selected.id}
                          lessonNoteId={session.lessonNote.id}
                          classSessionId={session.id}
                          repertoire={selected.repertoireItems}
                          skills={skillCategoriesForInstrument(data.skillCategories, session.instrument ?? selected.preferredInstrument)}
                          locale={viewer.locale}
                        />
                      </div>
                    ) : null}
                  </div>
                </details>
              ))}
              {!selected.sessions.length ? <CardDescription>{isSpanish ? "Aún no hay clases para documentar." : "No classes to document yet."}</CardDescription> : null}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3"><p className="font-display text-2xl">{value}</p><p className="text-xs text-[var(--color-ink-soft)]">{label}</p></div>;
}

function skillCategoriesForInstrument<T extends { instrument: string }>(skills: T[], instrument?: string | null) {
  const lessonInstrument = instrumentToSkillInstrument(instrument);
  return skills.filter((skill) => skill.instrument === "GENERAL" || skill.instrument === lessonInstrument);
}
