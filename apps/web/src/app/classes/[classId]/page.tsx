import Link from "next/link";
import { notFound } from "next/navigation";
import { Role, SessionStatus } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getClassDetailData } from "@/lib/data";
import { formatDateTimeInZone } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import { classStatusLabel, classTypeLabel } from "@/lib/class-session-labels";

type PageProps = { params: Promise<{ classId: string }> };

export default async function ClassDetailPage({ params }: PageProps) {
  const viewer = await requireViewer();
  const { classId } = await params;
  const session = await getClassDetailData(viewer, classId);
  if (!session) notFound();

  const isSpanish = viewer.locale === "es";
  const activePath = viewer.role === Role.ADMIN ? "/admin/schedule" : viewer.role === Role.TEACHER ? "/teacher/schedule" : "/schedule";
  const canComplete = viewer.role === Role.TEACHER && viewer.teacherProfileId === session.teacherId;

  return (
    <AppShell role={viewer.role} activePath={activePath} userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={viewer.role === Role.TEACHER ? session.studentId : null}>
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
          {viewer.role !== Role.STUDENT && session.internalNote ? <NoteBlock label={isSpanish ? "Nota interna" : "Internal note"} value={session.internalNote} /> : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <a href={session.meetingUrl} target="_blank" rel="noreferrer"><Button variant="gold" size="sm">{isSpanish ? "Entrar a clase" : "Join class"}</Button></a>
            {canComplete ? <Link href={`/teacher/classes/${session.id}/complete`}><Button variant="outline" size="sm">{isSpanish ? "Completar / actualizar" : "Complete / update"}</Button></Link> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Progreso relacionado" : "Related progress"}</CardTitle>
          <CardDescription>{isSpanish ? "Estado de nota de clase, tareas y evidencia." : "Lesson note, assignments, and evidence status."}</CardDescription>
          <div className="mt-4 space-y-3">
            <Info label={isSpanish ? "Nota estructurada" : "Structured note"} value={session.lessonNote ? (isSpanish ? "Creada" : "Created") : (isSpanish ? "Pendiente" : "Pending")} />
            {session.lessonNote?.studentVisibleNote ? <NoteBlock label={isSpanish ? "Resumen visible" : "Visible summary"} value={session.lessonNote.studentVisibleNote} /> : null}
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
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-1 text-sm text-[var(--color-ink)]">{value}</p></div>;
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/70 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{value}</p></div>;
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
