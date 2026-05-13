import Link from "next/link";
import { ClassRequestStatus, Role, SessionStatus } from "@prisma/client";

import { ClassRequestActions } from "@/components/schedule/class-request-actions";
import { SingleClassBookingForm } from "@/components/schedule/single-class-booking-form";
import { RecurringClassForm } from "@/components/teacher/recurring-class-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherScheduleData } from "@/lib/data";
import { formatDateTimeInZone } from "@/lib/i18n";
import { classRequestStatusLabel, classStatusLabel, classTypeLabel } from "@/lib/class-session-labels";

type PageProps = { searchParams?: Promise<{ studentId?: string }> };

export default async function TeacherSchedulePage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const params = await searchParams;
  const data = await getTeacherScheduleData(viewer, { studentId: params?.studentId });
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/teacher/schedule" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={data.selectedStudentId}>
      <PageIntro
        eyebrow={isSpanish ? "Agenda docente" : "Teacher schedule"}
        title={isSpanish ? "Reserva reposiciones y clases extra con seguridad." : "Book makeups and extra classes safely."}
        description={isSpanish ? "Solo puedes agendar estudiantes asignados a ti; los cruces se validan en el servidor." : "You can only book assigned students; overlaps are validated on the server."}
      />

      <Card>
        <CardTitle>{isSpanish ? "Crear clase individual" : "Create one-time class"}</CardTitle>
        <CardDescription>{isSpanish ? "Para reposiciones, práctica extra, evaluaciones o clases privadas únicas." : "For makeups, extra practice, evaluations, or one-time private lessons."}</CardDescription>
        <div className="mt-4">
          <SingleClassBookingForm
            role="teacher"
            students={data.students.map((assignment) => ({ id: assignment.student.id, name: assignment.student.user.name, instrument: assignment.student.preferredInstrument }))}
            defaultTimezone={data.teacher?.user.timezone ?? viewer.timezone}
            defaultTeacherId={data.teacher?.id}
            defaultMeetingUrl={data.teacher?.zoomLink ?? data.teacher?.meetLink}
            selectedStudentId={data.selectedStudentId}
            locale={viewer.locale}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>{isSpanish ? "Configurar clases recurrentes" : "Set up recurring classes"}</CardTitle>
        <CardDescription>{isSpanish ? "Crea una serie fija para estudiantes asignados." : "Create a fixed series for assigned students."}</CardDescription>
        <div className="mt-4">
          <RecurringClassForm
            students={data.students.map((assignment) => ({ id: assignment.student.id, name: assignment.student.user.name, instrument: assignment.student.preferredInstrument }))}
            defaultTimezone={data.teacher?.user.timezone ?? viewer.timezone}
            defaultMeetingUrl={data.teacher?.zoomLink ?? data.teacher?.meetLink}
            selectedStudentId={data.selectedStudentId}
            locale={viewer.locale}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle>{isSpanish ? "Clases próximas y recientes" : "Upcoming and recent classes"}</CardTitle>
          <CardDescription>{isSpanish ? "Incluye clases recurrentes e individuales." : "Includes recurring and one-off classes."}</CardDescription>
          <div className="mt-4 space-y-3">
            {data.sessions.map((session) => (
              <div key={session.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar src={session.student.user.image} alt={session.student.user.name} fallback={session.student.user.name.slice(0, 1)} className="h-8 w-8 text-[10px]" />
                      <p className="truncate text-sm font-semibold">{session.student.user.name}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={session.type === "RECURRING" ? "default" : "gold"}>{classTypeLabel(session.type, viewer.locale)}</Badge>
                      <Badge variant={session.status === SessionStatus.CANCELLED ? "danger" : session.status === SessionStatus.COMPLETED ? "success" : "default"}>{classStatusLabel(session.status, viewer.locale)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale)} · {Math.round((session.endsAtUtc.getTime() - session.startsAtUtc.getTime()) / 60000)} min</p>
                    {session.lessonFocus ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{session.lessonFocus}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/classes/${session.id}`}><Button size="sm" variant="outline">{isSpanish ? "Detalle" : "Detail"}</Button></Link>
                    <Link href={`/teacher/classes/${session.id}/complete`}><Button size="sm" variant="gold">{isSpanish ? "Completar" : "Complete"}</Button></Link>
                  </div>
                </div>
              </div>
            ))}
            {!data.sessions.length ? <CardDescription>{isSpanish ? "No hay clases en esta ventana." : "No classes in this window."}</CardDescription> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Solicitudes pendientes" : "Pending requests"}</CardTitle>
          <CardDescription>{isSpanish ? "Aprueba una solicitud para convertirla en clase." : "Approve a request to convert it into a class."}</CardDescription>
          <div className="mt-4 space-y-3">
            {data.classRequests.map((request) => (
              <div key={request.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{request.student.user.name}</p>
                  <Badge variant={request.status === ClassRequestStatus.PENDING ? "warning" : request.status === ClassRequestStatus.ACCEPTED ? "success" : "default"}>{classRequestStatusLabel(request.status, viewer.locale)}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{classTypeLabel(request.type, viewer.locale)} · {formatDateTimeInZone(request.preferredStartUtc, viewer.timezone, viewer.locale)} · {request.durationMin} min</p>
                {request.studentMessage ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{request.studentMessage}</p> : null}
                {request.status === ClassRequestStatus.REJECTED && request.rejectionReason ? (
                  <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {isSpanish ? "Motivo de rechazo" : "Rejection reason"}: {request.rejectionReason}
                  </p>
                ) : null}
                {request.internalNote ? (
                  <p className="mt-2 rounded-xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                    {isSpanish ? "Nota interna" : "Internal note"}: {request.internalNote}
                  </p>
                ) : null}
                {request.status === ClassRequestStatus.PENDING ? <div className="mt-3"><ClassRequestActions requestId={request.id} locale={viewer.locale} /></div> : null}
              </div>
            ))}
            {!data.classRequests.length ? <CardDescription>{isSpanish ? "No hay solicitudes pendientes o recientes." : "No pending or recent requests."}</CardDescription> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
