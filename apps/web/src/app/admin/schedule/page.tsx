import Link from "next/link";
import { ClassRequestStatus, Role, SessionStatus } from "@prisma/client";

import { ClassRequestActions } from "@/components/schedule/class-request-actions";
import { SingleClassBookingForm } from "@/components/schedule/single-class-booking-form";
import { RecurringClassForm } from "@/components/teacher/recurring-class-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminScheduleData } from "@/lib/data";
import { formatDateTimeInZone } from "@/lib/i18n";
import { classRequestStatusLabel, classStatusLabel, classTypeLabel } from "@/lib/class-session-labels";

export default async function AdminSchedulePage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getAdminScheduleData(viewer);
  const isSpanish = viewer.locale === "es";

  return (
    <AppShell role={viewer.role} activePath="/admin/schedule" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Gestión de agenda" : "Schedule management"}
        title={isSpanish ? "Agenda clases únicas sin romper las series recurrentes." : "Book one-off classes without disturbing recurring series."}
        description={isSpanish ? "Crea pruebas, reposiciones, evaluaciones y clases extra con validación de conflictos y notificaciones automáticas." : "Create trials, makeups, evaluations, and extras with conflict checks and automatic notifications."}
      />

      <Card>
        <CardTitle>{isSpanish ? "Agendar clase individual" : "Book one-time class"}</CardTitle>
        <CardDescription>{isSpanish ? "El sistema bloquea cruces de docente y estudiante; las clases canceladas no bloquean agenda." : "The system blocks teacher/student overlaps; cancelled classes do not block schedule."}</CardDescription>
        <div className="mt-4">
          <SingleClassBookingForm
            role="admin"
            students={data.students.map((student) => ({ id: student.id, name: student.user.name, instrument: student.preferredInstrument, teacherId: student.assignment?.teacherId, timezone: student.user.timezone }))}
            teachers={data.teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name, timezone: teacher.user.timezone }))}
            defaultTimezone={viewer.timezone}
            locale={viewer.locale}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>{isSpanish ? "Configurar clases recurrentes" : "Set up recurring classes"}</CardTitle>
        <CardDescription>{isSpanish ? "Crea una serie fija para cualquier estudiante y docente." : "Create a fixed series for any student and teacher."}</CardDescription>
        <div className="mt-4">
          <RecurringClassForm
            role="admin"
            students={data.students.map((student) => ({ id: student.id, name: student.user.name, instrument: student.preferredInstrument, timezone: student.user.timezone }))}
            teachers={data.teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name, timezone: teacher.user.timezone }))}
            defaultTimezone={viewer.timezone}
            locale={viewer.locale}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardTitle>{isSpanish ? "Clases programadas" : "Scheduled classes"}</CardTitle>
          <CardDescription>{isSpanish ? "Recurrentes e individuales en una sola vista operacional." : "Recurring and one-off classes in one operational view."}</CardDescription>
          <div className="mt-4 space-y-3">
            {data.sessions.map((session) => (
              <ClassRow key={session.id} session={session} timezone={viewer.timezone} locale={viewer.locale} />
            ))}
            {!data.sessions.length ? <CardDescription>{isSpanish ? "No hay clases próximas." : "No upcoming classes."}</CardDescription> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Solicitudes de clase" : "Class requests"}</CardTitle>
          <CardDescription>{isSpanish ? "Aprueba o rechaza solicitudes de estudiantes." : "Approve or reject student requests."}</CardDescription>
          <div className="mt-4 space-y-3">
            {data.classRequests.map((request) => (
              <div key={request.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{request.student.user.name}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{request.teacher.user.name} · {classTypeLabel(request.type, viewer.locale)}</p>
                  </div>
                  <Badge variant={request.status === ClassRequestStatus.PENDING ? "warning" : request.status === ClassRequestStatus.ACCEPTED ? "success" : "default"}>{classRequestStatusLabel(request.status, viewer.locale)}</Badge>
                </div>
                <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(request.preferredStartUtc, viewer.timezone, viewer.locale)} · {request.durationMin} min</p>
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

function ClassRow({ session, timezone, locale }: { session: Awaited<ReturnType<typeof getAdminScheduleData>>["sessions"][number]; timezone: string; locale: "en" | "es" }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={session.type === "RECURRING" ? "default" : "gold"}>{classTypeLabel(session.type, locale)}</Badge>
            <Badge variant={session.status === SessionStatus.CANCELLED ? "danger" : session.status === SessionStatus.COMPLETED ? "success" : "default"}>{classStatusLabel(session.status, locale)}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold">{session.student.user.name} · {session.teacher.user.name}</p>
          <p className="text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(session.startsAtUtc, timezone, locale)} · {Math.round((session.endsAtUtc.getTime() - session.startsAtUtc.getTime()) / 60000)} min</p>
          <p className="text-xs text-[var(--color-ink-soft)]">
            {locale === "es" ? "Estudiante" : "Student"}: {formatDateTimeInZone(session.startsAtUtc, session.student.user.timezone, locale)} ({session.student.user.timezone})
          </p>
          <p className="text-xs text-[var(--color-ink-soft)]">
            {locale === "es" ? "Docente" : "Teacher"}: {formatDateTimeInZone(session.startsAtUtc, session.teacher.user.timezone, locale)} ({session.teacher.user.timezone})
          </p>
          {session.lessonFocus ? <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{session.lessonFocus}</p> : null}
        </div>
        <Link href={`/classes/${session.id}`}><Button size="sm" variant="outline">{locale === "es" ? "Ver detalle" : "View detail"}</Button></Link>
      </div>
    </div>
  );
}
