import Link from "next/link";
import { Role } from "@prisma/client";

import { ExamAssessmentForm } from "@/components/progress/exam-assessment-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherProgressData } from "@/lib/data";
import { formatDate } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";

type PageProps = { searchParams?: Promise<{ studentId?: string }> };

export default async function TeacherProgressExamsPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const params = await searchParams;
  const data = await getTeacherProgressData(viewer, { studentId: params?.studentId });
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/progress/exams" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.selectedStudentId}>
      <PageIntro
        eyebrow={isSpanish ? "Evaluaciones" : "Assessments"}
        title={isSpanish ? "Gestiona evaluaciones de examen." : "Manage exam assessments."}
        description={isSpanish ? "Registra exámenes históricos o corrige resultados de repertorio, armonía y lectura musical para estudiantes asignados." : "Record historical exams or correct repertoire, harmony, and music reading results for assigned students."}
      />

      {!data.selected ? (
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
                <Link href={`/teacher/progress/exams?studentId=${item.student.id}`}>
                  <Button size="sm" variant="outline">{isSpanish ? "Abrir" : "Open"}</Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
                {isSpanish ? "Selecciona este estudiante para registrar o editar evaluaciones." : "Select this student to record or edit exam assessments."}
              </p>
            </Card>
          ))}
          {!data.students.length ? <Card><CardDescription>{isSpanish ? "No tienes estudiantes asignados." : "You do not have assigned students."}</CardDescription></Card> : null}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={data.selected.user.image} alt={data.selected.user.name} fallback={data.selected.user.name.slice(0, 1)} locale={viewer.locale} />
                <div className="min-w-0">
                  <CardTitle>{data.selected.user.name}</CardTitle>
                  <CardDescription>{instrumentLabel(data.selected.preferredInstrument, viewer.locale) || (isSpanish ? "Música" : "Music")}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/teacher/progress?studentId=${data.selected.id}`}>
                  <Button variant="outline" size="sm">{isSpanish ? "Volver al progreso" : "Back to progress"}</Button>
                </Link>
                <Link href={`/teacher/progress/reports?studentId=${data.selected.id}`}>
                  <Button variant="outline" size="sm">{isSpanish ? "Reportes" : "Reports"}</Button>
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label={isSpanish ? "Evaluaciones" : "Assessments"} value={data.selected.examAssessments.length} />
              <Metric label={isSpanish ? "Repertorio disponible" : "Available repertoire"} value={data.examRepertoireItems.length} />
              <Metric label={isSpanish ? "Última evaluación" : "Latest assessment"} value={data.selected.examAssessments[0] ? formatDate(data.selected.examAssessments[0].examDate, viewer.locale) : "-"} />
              <Metric label={isSpanish ? "Docente" : "Teacher"} value={data.teacher?.user.name ?? "-"} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <ExamAssessmentForm
              locale={viewer.locale}
              lockedStudent
              initialStudentId={data.selected.id}
              initialTeacherId={data.teacher?.id}
              studentOptions={[{
                id: data.selected.id,
                name: data.selected.user.name,
                teacherId: data.teacher?.id,
                teacherName: data.teacher?.user.name,
                repertoireItems: data.examRepertoireItems.map((item) => ({
                  id: item.id,
                  title: item.title,
                  composerOrArtist: item.composerOrArtist,
                  status: item.status,
                  masteryPercent: item.masteryPercent,
                })),
              }]}
              existingAssessments={data.selected.examAssessments.map(toExamAssessmentFormData)}
            />
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
      <p className="font-display text-2xl">{value}</p>
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}

function toExamAssessmentFormData(assessment: NonNullable<Awaited<ReturnType<typeof getTeacherProgressData>>["selected"]>["examAssessments"][number]) {
  return {
    id: assessment.id,
    studentId: assessment.studentId,
    teacherId: assessment.teacherId,
    teacherName: assessment.teacher.user.name,
    classSessionId: assessment.classSessionId,
    examDate: assessment.examDate.toISOString(),
    title: assessment.title,
    notes: assessment.notes,
    publishedAt: assessment.publishedAt?.toISOString() ?? null,
    publishedByName: assessment.publishedBy?.name ?? null,
    repertoireScores: assessment.repertoireScores.map((row) => ({
      id: row.id,
      repertoireItemId: row.repertoireItemId,
      titleSnapshot: row.titleSnapshot,
      composerSnapshot: row.composerSnapshot,
      interpretationScore: row.interpretationScore,
      executionScore: row.executionScore,
      overallScore: row.overallScore,
      comments: row.comments,
    })),
    areaScores: assessment.areaScores.map((row) => ({
      id: row.id,
      area: row.area,
      topic: row.topic,
      objective: row.objective,
      score: row.score,
      comments: row.comments,
    })),
  };
}
