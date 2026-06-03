import Link from "next/link";
import { notFound } from "next/navigation";
import { PracticeAssignmentStatus, RepertoireStatus, Role, SessionStatus, StudentExamArea, VideoStatus } from "@prisma/client";

import { ClassInProgressCard } from "@/components/classes/class-in-progress-card";
import { JoinClassButton, MarkClassStartedButton } from "@/components/classes/join-class-button";
import { ExamPublishButton } from "@/components/progress/exam-publish-button";
import { CancelPendingClassButton } from "@/components/teacher/cancel-pending-class-button";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormattedNoteText } from "@/components/ui/formatted-note-text";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getClassDetailData } from "@/lib/data";
import { formatDate, formatDateTimeInZone } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import { classStatusLabel, classTypeLabel } from "@/lib/class-session-labels";
import { getSkillDisplayName } from "@/lib/skills/default-skills";
import { studentLevelLabel } from "@/lib/student-levels";

type PageProps = { params: Promise<{ classId: string }> };
type ClassDetailData = NonNullable<Awaited<ReturnType<typeof getClassDetailData>>>;
type TeacherPrepData = NonNullable<ClassDetailData["teacherPrep"]>;

export default async function ClassDetailPage({ params }: PageProps) {
  const viewer = await requireViewer();
  const { classId } = await params;
  const session = await getClassDetailData(viewer, classId);
  if (!session) notFound();

  const isSpanish = viewer.locale === "es";
  const activePath = viewer.role === Role.ADMIN ? "/admin/schedule" : viewer.role === Role.TEACHER ? "/teacher/schedule" : viewer.role === Role.PARENT ? "/parent/schedule" : "/schedule";
  const canComplete = viewer.role === Role.TEACHER && viewer.teacherProfileId === session.teacherId && session.status !== SessionStatus.RESCHEDULE_PENDING;
  const canDirectReschedule = viewer.role === Role.TEACHER && viewer.teacherProfileId === session.teacherId && session.status === SessionStatus.RESCHEDULE_PENDING;
  const canCancelPending = canDirectReschedule;
  const canStartClass = viewer.role === Role.TEACHER && viewer.teacherProfileId === session.teacherId && session.status === SessionStatus.SCHEDULED;
  const showInProgress = Boolean(session.startedAt) && session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.NO_SHOW && session.status !== SessionStatus.CANCELLED;

  return (
    <AppShell
      role={viewer.role}
      activePath={activePath}
      userName={viewer.name}
      locale={viewer.locale}
      selectedTeacherStudentId={viewer.role === Role.TEACHER ? session.studentId : null}
      selectedParentStudentId={viewer.role === Role.PARENT ? session.studentId : null}
    >
      <PageIntro
        eyebrow={isSpanish ? "Detalle de clase" : "Class detail"}
        title={isSpanish ? "Información completa de la clase." : "Complete class information."}
        description={isSpanish ? "Consulta horario, tipo, notas visibles y estado de progreso." : "Review time, type, visible notes, and progress status."}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{session.student.user.name} · {session.teacher.user.name}</CardTitle>
              <CardDescription>{formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale)} · {Math.round((session.endsAtUtc.getTime() - session.startsAtUtc.getTime()) / 60000)} min</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={session.type === "RECURRING" ? "default" : "gold"}>{classTypeLabel(session.type, viewer.locale)}</Badge>
              <Badge variant={session.status === SessionStatus.CANCELLED ? "danger" : session.status === SessionStatus.COMPLETED ? "success" : "default"}>{classStatusLabel(session.status, viewer.locale)}</Badge>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label={isSpanish ? "Zona horaria guardada" : "Stored timezone"} value={session.timezone} />
            <Info label={isSpanish ? "Hora estudiante" : "Student time"} value={`${formatDateTimeInZone(session.startsAtUtc, session.student.user.timezone, viewer.locale)} (${session.student.user.timezone})`} />
            <Info label={isSpanish ? "Hora docente" : "Teacher time"} value={`${formatDateTimeInZone(session.startsAtUtc, session.teacher.user.timezone, viewer.locale)} (${session.teacher.user.timezone})`} />
            <Info label={isSpanish ? "Modalidad" : "Mode"} value={modeLabel(session.locationMode, viewer.locale)} />
            <Info label={isSpanish ? "Instrumento" : "Instrument"} value={instrumentLabel(session.instrument ?? session.student.preferredInstrument, viewer.locale) || "-"} />
            <Info label={isSpanish ? "Serie recurrente" : "Recurring series"} value={session.recurrence ? (isSpanish ? "Sí" : "Yes") : (isSpanish ? "No" : "No")} />
            {session.recurrence ? <Info label={isSpanish ? "Modo de horario" : "Timezone mode"} value={recurringTimezoneModeLabel(session.recurrence.timezoneMode, viewer.locale)} /> : null}
          </div>

          {session.lessonFocus ? <NoteBlock label={isSpanish ? "Enfoque" : "Focus"} value={session.lessonFocus} /> : null}
          {session.studentVisibleNote ? <NoteBlock label={isSpanish ? "Nota para estudiante/padre" : "Student/parent note"} value={session.studentVisibleNote} /> : null}
          {viewer.role !== Role.STUDENT && viewer.role !== Role.PARENT && session.internalNote ? <NoteBlock label={isSpanish ? "Nota interna" : "Internal note"} value={session.internalNote} /> : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <JoinClassButton
              classId={session.id}
              meetingUrl={session.meetingUrl}
              locale={viewer.locale}
              label={isSpanish ? "Entrar a clase" : "Join class"}
              teacherCanStart={canStartClass}
              variant="gold"
              size="sm"
            />
            {canStartClass && !session.startedAt ? (
              <MarkClassStartedButton
                classId={session.id}
                locale={viewer.locale}
                label={isSpanish ? "Marcar como iniciada" : "Mark as started"}
                variant="outline"
                size="sm"
              />
            ) : null}
            {canDirectReschedule ? <Link href={`/teacher/classes/${session.id}/reschedule`}><Button variant="gold" size="sm">{isSpanish ? "Reagendar" : "Reschedule"}</Button></Link> : null}
            {canCancelPending ? <CancelPendingClassButton classId={session.id} locale={viewer.locale} redirectHref="/classes/[classId]" /> : null}
            {canComplete ? <Link href={`/teacher/classes/${session.id}/complete`}><Button variant="outline" size="sm">{isSpanish ? "Completar / actualizar" : "Complete / update"}</Button></Link> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Progreso relacionado" : "Related progress"}</CardTitle>
          <CardDescription>{isSpanish ? "Estado de nota de clase, tareas y evidencia." : "Lesson note, assignments, and evidence status."}</CardDescription>
          <div className="mt-4 space-y-3">
            <Info label={isSpanish ? "Nota estructurada" : "Structured note"} value={session.lessonNote ? (isSpanish ? "Creada" : "Created") : session.examAssessment ? (isSpanish ? "Evaluación registrada" : "Exam recorded") : (isSpanish ? "Pendiente" : "Pending")} />
            {session.lessonNote?.studentVisibleNote ? <NoteBlock label={isSpanish ? "Resumen visible" : "Visible summary"} value={session.lessonNote.studentVisibleNote} /> : null}
            {viewer.role !== Role.STUDENT && viewer.role !== Role.PARENT && session.examAssessment ? <ExamAssessmentSummary assessment={session.examAssessment} locale={viewer.locale} /> : null}
            <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{isSpanish ? "Archivos de esta clase" : "Files for this class"}</p>
              <div className="mt-2 space-y-2">
                {session.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    className="block truncate rounded-lg border border-[var(--color-border)] bg-white/70 px-3 py-2 text-sm font-semibold text-[var(--color-ink)] underline decoration-[var(--color-gold)] underline-offset-4"
                    href={`/api/media/class-attachments/${attachment.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {attachment.originalName} · {formatBytes(attachment.sizeBytes)}
                  </a>
                ))}
                {!session.attachments.length ? <p className="text-sm text-[var(--color-ink-soft)]">{isSpanish ? "Sin materiales adjuntos todavía." : "No materials attached yet."}</p> : null}
              </div>
            </div>
            {session.practiceAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                <p className="text-sm font-semibold">{assignment.title}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{assignment.expectedMinutes ?? 0} min · {assignment.requiresVideo ? (isSpanish ? "requiere video" : "requires video") : (isSpanish ? "sin video" : "no video")}</p>
              </div>
            ))}
            {!session.practiceAssignments.length ? <CardDescription>{isSpanish ? "Sin tareas vinculadas todavía." : "No linked assignments yet."}</CardDescription> : null}
          </div>
        </Card>
      </div>

      {showInProgress && session.startedAt ? (
        <div className="mt-4">
          <ClassInProgressCard
            startedAt={session.startedAt.toISOString()}
            startsAtUtc={session.startsAtUtc.toISOString()}
            endsAtUtc={session.endsAtUtc.toISOString()}
            locale={viewer.locale}
            completeHref={canComplete ? `/teacher/classes/${session.id}/complete` : undefined}
          />
        </div>
      ) : null}

      {canComplete && session.teacherPrep ? (
        <TeacherPreparationWorkspace session={session} prep={session.teacherPrep} locale={viewer.locale} />
      ) : null}
    </AppShell>
  );
}

function TeacherPreparationWorkspace({ session, prep, locale }: { session: ClassDetailData; prep: TeacherPrepData; locale: "en" | "es" }) {
  const copy = prepCopy(locale);
  const previousNote = prep.previousLesson?.lessonNote;
  const repertoireAttachments = prep.activeRepertoire.flatMap((item) => item.attachments.map((attachment) => ({ ...attachment, repertoireTitle: item.title })));
  const canStartClass = session.status === SessionStatus.SCHEDULED;

  return (
    <section className="mt-4 space-y-4" aria-labelledby="teacher-prep-heading">
      <Card className="overflow-hidden border-[var(--color-gold)]/25 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(250,239,217,0.72))]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{copy.eyebrow}</p>
            <CardTitle id="teacher-prep-heading" className="mt-1">{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <JoinClassButton
              classId={session.id}
              meetingUrl={session.meetingUrl}
              locale={locale}
              label={copy.joinClass}
              teacherCanStart={canStartClass}
              variant="gold"
              size="sm"
            />
            {canStartClass && !session.startedAt ? (
              <MarkClassStartedButton
                classId={session.id}
                locale={locale}
                label={copy.markStarted}
                variant="outline"
                size="sm"
              />
            ) : null}
            <Link href={`/teacher/classes/${session.id}/complete`}><Button variant="outline" size="sm">{copy.completeClass}</Button></Link>
          </div>
        </div>
        <div className="mt-4 rounded-[1.25rem] border border-[var(--color-gold)]/25 bg-white/75 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold-deep)]">{copy.suggestedFocus}</p>
          <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{suggestedFocusText(prep.suggestedFocus.text, prep.suggestedFocus.source, locale)}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{suggestedFocusSource(prep.suggestedFocus.source, locale)}</p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardTitle>{copy.studentSnapshot}</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label={copy.currentLevel} value={studentLevelLabel(prep.latestLevel?.level, locale)} />
            <Info label={copy.instrument} value={instrumentLabel(session.instrument ?? session.student.preferredInstrument, locale) || "-"} />
            <Info label={copy.teacherTime} value={`${formatDateTimeInZone(session.startsAtUtc, session.teacher.user.timezone, locale)} (${session.teacher.user.timezone})`} />
            <Info label={copy.studentTime} value={`${formatDateTimeInZone(session.startsAtUtc, session.student.user.timezone, locale)} (${session.student.user.timezone})`} />
            <Info label={copy.classStatus} value={classStatusLabel(session.status, locale)} />
            <Info label={copy.timezone} value={session.student.user.timezone} />
          </div>
        </Card>

        <Card>
          <CardTitle>{copy.lastLesson}</CardTitle>
          {previousNote ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {prep.previousLesson ? formatDateTimeInZone(prep.previousLesson.startsAtUtc, session.teacher.user.timezone, locale) : ""}
              </p>
              <NoteBlock label={copy.lessonSummary} value={previousNote.summary} />
              {previousNote.studentDidWell ? <NoteBlock label={copy.generalComments} value={previousNote.studentDidWell} /> : null}
              {previousNote.needsImprovement ? <NoteBlock label={copy.historicalImprovement} value={previousNote.needsImprovement} /> : null}
              {previousNote.nextLessonFocus ? <NoteBlock label={copy.nextLessonFocus} value={previousNote.nextLessonFocus} /> : null}
              <div className="grid gap-2 sm:grid-cols-4">
                <RatingMetric label={copy.preparedness} value={previousNote.preparednessRating} />
                <RatingMetric label={copy.focus} value={previousNote.focusRating} />
                <RatingMetric label={copy.effort} value={previousNote.effortRating} />
                <RatingMetric label={copy.overall} value={previousNote.overallLessonRating} />
              </div>
            </div>
          ) : (
            <CardDescription className="mt-3">{copy.noLastLesson}</CardDescription>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="min-w-0 overflow-hidden">
          <CardTitle>{copy.activeRepertoire}</CardTitle>
          <div className="mt-4 space-y-3">
            {prep.activeRepertoire.map((item) => (
              <div key={item.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="break-words text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                  <Badge variant="gold">{repertoireStatusLabel(item.status, locale)}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{item.masteryPercent}% · {item.currentFocusSection ?? copy.noFocusSection}</p>
                {item.teacherNotes ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{item.teacherNotes}</p> : null}
                {item.attachments.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.attachments.map((attachment) => (
                      <a key={attachment.id} href={`/api/media/repertoire-attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-ink)] underline decoration-[var(--color-gold)] underline-offset-4">
                        {attachment.originalName}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {!prep.activeRepertoire.length ? <CardDescription>{copy.noRepertoire}</CardDescription> : null}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardTitle>{copy.practiceStatus}</CardTitle>
          <div className="mt-4 space-y-3">
            {prep.activeAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="break-words text-sm font-semibold text-[var(--color-ink)]">{assignment.title}</p>
                  <Badge variant={assignment.status === PracticeAssignmentStatus.OVERDUE ? "danger" : assignment.status === PracticeAssignmentStatus.COMPLETED ? "success" : "default"}>{assignmentStatusLabel(assignment.status, locale)}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                  {assignment.dueDate ? `${copy.due}: ${formatDate(assignment.dueDate, locale)} · ` : ""}{assignment.expectedMinutes ?? 0} min · {assignment.requiresVideo ? copy.videoRequired : copy.videoOptional}
                </p>
                {assignment.instructions ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{assignment.instructions}</p> : null}
                <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                  {copy.recentLogs}: {assignment.practiceLogs.length} · {copy.recentVideos}: {assignment.practiceVideos.length}
                </p>
              </div>
            ))}
            {!prep.activeAssignments.length ? <CardDescription>{copy.noAssignments}</CardDescription> : null}
          </div>
          {prep.recentPracticeLogs.length ? (
            <div className="mt-4 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)]/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{copy.recentPractice}</p>
              <div className="mt-2 space-y-2">
                {prep.recentPracticeLogs.slice(0, 3).map((log) => (
                  <p key={log.id} className="text-xs text-[var(--color-ink-soft)]">
                    <span className="font-semibold text-[var(--color-ink)]">{log.minutesPracticed} min</span> · {formatDate(log.practicedOn, locale)} · {log.notes ?? log.assignment?.title ?? log.repertoireItem?.title ?? "-"}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardTitle>{copy.recentVideos}</CardTitle>
          <div className="mt-4 space-y-3">
            {prep.recentVideos.map((video) => (
              <div key={video.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="break-words text-sm font-semibold text-[var(--color-ink)]">{video.originalName}</p>
                  <Badge variant={video.status === VideoStatus.PENDING ? "warning" : "success"}>{videoStatusLabel(video.status, locale)}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{formatDate(video.submittedAt, locale)} · {[video.practiceAssignment?.title, video.repertoireItem?.title, video.skillCategory ? getSkillDisplayName(video.skillCategory.name, locale) : null].filter(Boolean).join(" · ") || copy.generalPractice}</p>
                {video.feedback[0]?.comment ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{video.feedback[0].comment}</p> : null}
              </div>
            ))}
            {!prep.recentVideos.length ? <CardDescription>{copy.noVideos}</CardDescription> : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{copy.materials}</CardTitle>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <MaterialList title={copy.classMaterials} emptyText={copy.noClassMaterials} items={session.attachments.map((attachment) => ({ id: attachment.id, name: attachment.originalName, meta: formatBytes(attachment.sizeBytes), href: `/api/media/class-attachments/${attachment.id}` }))} />
          <MaterialList title={copy.repertoireSheets} emptyText={copy.noRepertoireSheets} items={repertoireAttachments.map((attachment) => ({ id: attachment.id, name: attachment.originalName, meta: attachment.repertoireTitle, href: `/api/media/repertoire-attachments/${attachment.id}` }))} />
        </div>
      </Card>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-1 text-sm text-[var(--color-ink)]">{value}</p></div>;
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/70 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{label}</p><FormattedNoteText className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{value}</FormattedNoteText></div>;
}

function RatingMetric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
      <p className="font-display text-2xl text-[var(--color-ink)]">{value ? `${value}/5` : "-"}</p>
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}

function ExamAssessmentSummary({ assessment, locale }: { assessment: NonNullable<ClassDetailData["examAssessment"]>; locale: "en" | "es" }) {
  const isSpanish = locale === "es";
  const harmonyCount = assessment.areaScores.filter((row) => row.area === StudentExamArea.HARMONY).length;
  const readingCount = assessment.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING).length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{isSpanish ? "Evaluación de examen" : "Exam assessment"}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{assessment.title}</p>
          <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(assessment.examDate, locale)} · {assessment.teacher.user.name}</p>
          {assessment.publishedAt ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{isSpanish ? "Publicada" : "Published"} · {formatDate(assessment.publishedAt, locale)}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={assessment.publishedAt ? "success" : "gold"}>{assessment.publishedAt ? (isSpanish ? "Publicada" : "Published") : (isSpanish ? "Interna" : "Internal")}</Badge>
          <a href={`/api/progress/exam-assessments/${assessment.id}/pdf`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">{isSpanish ? "PDF" : "PDF"}</Button></a>
          <ExamPublishButton assessmentId={assessment.id} published={Boolean(assessment.publishedAt)} locale={locale} />
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Info label={isSpanish ? "Canciones" : "Songs"} value={String(assessment.repertoireScores.length)} />
        <Info label={isSpanish ? "Armonía" : "Harmony"} value={String(harmonyCount)} />
        <Info label={isSpanish ? "Lectura" : "Reading"} value={String(readingCount)} />
      </div>
      <div className="mt-3 space-y-2">
        {assessment.repertoireScores.map((row) => (
          <p key={row.id} className="rounded-lg border border-[var(--color-border)] bg-white/75 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
            <span className="font-semibold text-[var(--color-ink)]">{row.titleSnapshot}</span> · {isSpanish ? "Interpretación" : "Interpretation"} {row.interpretationScore}/10 · {isSpanish ? "Ejecución" : "Execution"} {row.executionScore}/10 · {isSpanish ? "General" : "Overall"} {row.overallScore}/10
          </p>
        ))}
      </div>
      {assessment.notes ? <p className="mt-3 text-sm text-[var(--color-ink-soft)]">{assessment.notes}</p> : null}
    </div>
  );
}

function MaterialList({ title, emptyText, items }: { title: string; emptyText: string; items: Array<{ id: string; name: string; meta: string; href: string }> }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <a
            key={item.id}
            className="block truncate rounded-lg border border-[var(--color-border)] bg-white/75 px-3 py-2 text-sm font-semibold text-[var(--color-ink)] underline decoration-[var(--color-gold)] underline-offset-4 transition hover:border-[var(--color-gold)]/45 hover:bg-white"
            href={item.href}
            target="_blank"
            rel="noreferrer"
          >
            {item.name} · <span className="font-normal text-[var(--color-ink-soft)]">{item.meta}</span>
          </a>
        ))}
        {!items.length ? <p className="text-sm text-[var(--color-ink-soft)]">{emptyText}</p> : null}
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function suggestedFocusText(text: string, source: TeacherPrepData["suggestedFocus"]["source"], locale: "en" | "es") {
  if (text) return text;
  return locale === "es"
    ? "Revisar el repertorio actual, confirmar práctica en casa y definir el próximo enfoque."
    : "Review current repertoire, confirm home practice, and set the next focus.";
}

function suggestedFocusSource(source: TeacherPrepData["suggestedFocus"]["source"], locale: "en" | "es") {
  const labels = {
    es: {
      CLASS_FOCUS: "Tomado del enfoque de esta clase.",
      PREVIOUS_LESSON: "Tomado del próximo enfoque de la clase anterior.",
      ASSIGNMENT: "Basado en tareas activas o vencidas.",
      REPERTOIRE: "Basado en repertorio activo o dominio bajo.",
      VIDEO: "Basado en videos recientes pendientes.",
      FALLBACK: "Sugerencia base cuando aún no hay evidencia reciente.",
    },
    en: {
      CLASS_FOCUS: "Taken from this class focus.",
      PREVIOUS_LESSON: "Taken from the previous lesson’s next focus.",
      ASSIGNMENT: "Based on active or overdue assignments.",
      REPERTOIRE: "Based on active repertoire or lower mastery.",
      VIDEO: "Based on recent pending videos.",
      FALLBACK: "Baseline suggestion when there is no recent evidence yet.",
    },
  } as const;
  return labels[locale][source];
}

function assignmentStatusLabel(status: PracticeAssignmentStatus, locale: "en" | "es") {
  const es: Record<PracticeAssignmentStatus, string> = { ASSIGNED: "Asignada", IN_PROGRESS: "En progreso", COMPLETED: "Completada", REVIEWED: "Revisada", OVERDUE: "Vencida" };
  const en: Record<PracticeAssignmentStatus, string> = { ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed", REVIEWED: "Reviewed", OVERDUE: "Overdue" };
  return (locale === "es" ? es : en)[status];
}

function repertoireStatusLabel(status: RepertoireStatus, locale: "en" | "es") {
  const es: Record<RepertoireStatus, string> = { ASSIGNED: "Asignada", LEARNING: "Aprendiendo", IMPROVING: "Mejorando", PERFORMANCE_READY: "Lista para presentar", COMPLETED: "Completada", PAUSED: "Pausada" };
  const en: Record<RepertoireStatus, string> = { ASSIGNED: "Assigned", LEARNING: "Learning", IMPROVING: "Improving", PERFORMANCE_READY: "Performance ready", COMPLETED: "Completed", PAUSED: "Paused" };
  return (locale === "es" ? es : en)[status];
}

function videoStatusLabel(status: VideoStatus, locale: "en" | "es") {
  const es: Record<VideoStatus, string> = { PENDING: "Pendiente", REVIEWED: "Revisado", FEEDBACK_GIVEN: "Comentarios enviados" };
  const en: Record<VideoStatus, string> = { PENDING: "Pending", REVIEWED: "Reviewed", FEEDBACK_GIVEN: "Feedback given" };
  return (locale === "es" ? es : en)[status];
}

function prepCopy(locale: "en" | "es") {
  return locale === "es"
    ? {
        eyebrow: "Preparación docente",
        title: "Espacio de preparación",
        description: "Todo lo importante antes de entrar a clase, reunido desde el progreso real del estudiante.",
        joinClass: "Entrar a clase",
        markStarted: "Marcar como iniciada",
        completeClass: "Completar / actualizar",
        suggestedFocus: "Enfoque sugerido",
        studentSnapshot: "Resumen del estudiante",
        currentLevel: "Nivel actual",
        instrument: "Instrumento",
        teacherTime: "Hora docente",
        studentTime: "Hora estudiante",
        classStatus: "Estado de clase",
        timezone: "Zona del estudiante",
        lastLesson: "Última clase",
        lessonSummary: "Resumen de clase",
        generalComments: "Comentarios generales",
        historicalImprovement: "Áreas a mejorar históricas",
        nextLessonFocus: "Próximo enfoque",
        preparedness: "Preparación",
        focus: "Enfoque",
        effort: "Esfuerzo",
        overall: "General",
        noLastLesson: "Aún no hay una clase anterior completada con nota.",
        activeRepertoire: "Repertorio activo",
        noFocusSection: "sin enfoque específico",
        noRepertoire: "Sin repertorio activo todavía.",
        practiceStatus: "Estado de práctica",
        due: "Vence",
        videoRequired: "requiere video",
        videoOptional: "video opcional",
        recentLogs: "Registros",
        recentVideos: "Videos recientes",
        noAssignments: "Sin tareas activas por ahora.",
        recentPractice: "Práctica reciente",
        noVideos: "Sin videos recientes.",
        generalPractice: "Práctica general",
        materials: "Materiales",
        classMaterials: "Archivos de esta clase",
        noClassMaterials: "Sin materiales adjuntos a esta clase.",
        repertoireSheets: "Partituras de repertorio",
        noRepertoireSheets: "Sin partituras asociadas al repertorio activo.",
      }
    : {
        eyebrow: "Teacher preparation",
        title: "Preparation workspace",
        description: "Everything important before class, gathered from the student’s real progress.",
        joinClass: "Join class",
        markStarted: "Mark as started",
        completeClass: "Complete / update",
        suggestedFocus: "Suggested focus",
        studentSnapshot: "Student snapshot",
        currentLevel: "Current level",
        instrument: "Instrument",
        teacherTime: "Teacher time",
        studentTime: "Student time",
        classStatus: "Class status",
        timezone: "Student timezone",
        lastLesson: "Last lesson",
        lessonSummary: "Lesson summary",
        generalComments: "General comments",
        historicalImprovement: "Historical improvement areas",
        nextLessonFocus: "Next lesson focus",
        preparedness: "Preparedness",
        focus: "Focus",
        effort: "Effort",
        overall: "Overall",
        noLastLesson: "There is no previous completed lesson note yet.",
        activeRepertoire: "Active repertoire",
        noFocusSection: "no specific focus",
        noRepertoire: "No active repertoire yet.",
        practiceStatus: "Practice status",
        due: "Due",
        videoRequired: "requires video",
        videoOptional: "video optional",
        recentLogs: "Logs",
        recentVideos: "Recent videos",
        noAssignments: "No active assignments for now.",
        recentPractice: "Recent practice",
        noVideos: "No recent videos.",
        generalPractice: "General practice",
        materials: "Materials",
        classMaterials: "Files for this class",
        noClassMaterials: "No materials attached to this class.",
        repertoireSheets: "Repertoire sheets",
        noRepertoireSheets: "No sheets attached to active repertoire.",
      };
}

function modeLabel(value: string, locale: "en" | "es") {
  const labels: Record<string, { en: string; es: string }> = {
    ONLINE: { en: "Online", es: "Online" },
    IN_PERSON: { en: "In person", es: "Presencial" },
    HYBRID: { en: "Hybrid", es: "Híbrida" },
  };
  return labels[value]?.[locale] ?? value;
}

function recurringTimezoneModeLabel(mode: string | null | undefined, locale: "en" | "es") {
  if (mode === "TEACHER_TIME") return locale === "es" ? "hora docente" : "teacher time";
  if (mode === "CUSTOM_TIMEZONE") return locale === "es" ? "zona personalizada" : "custom timezone";
  return locale === "es" ? "hora del estudiante" : "student time";
}
