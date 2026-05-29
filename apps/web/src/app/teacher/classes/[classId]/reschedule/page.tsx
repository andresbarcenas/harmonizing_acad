import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { RescheduleStatus, Role, SessionStatus } from "@prisma/client";

import { DirectRescheduleForm } from "@/components/teacher/direct-reschedule-form";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { classStatusLabel, classTypeLabel } from "@/lib/class-session-labels";
import { db } from "@/lib/db";
import { formatDateTimeInZone } from "@/lib/i18n";

export default async function TeacherRescheduleClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const viewer = await requireViewer([Role.TEACHER]);
  const { classId } = await params;
  if (!viewer.teacherProfileId) notFound();

  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: viewer.teacherProfileId,
    },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      rescheduleRequests: {
        where: { status: RescheduleStatus.PENDING },
        select: { id: true, studentMessage: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!session || session.status !== SessionStatus.RESCHEDULE_PENDING) notFound();

  const isSpanish = viewer.locale === "es";
  const teacherTimezone = session.teacher.user.timezone;
  const studentTimezone = session.student.user.timezone;
  const durationMin = Math.round((session.endsAtUtc.getTime() - session.startsAtUtc.getTime()) / 60000);
  const defaultDateBase = session.startsAtUtc > new Date() ? session.startsAtUtc : addDays(new Date(), 1);
  const defaultDate = formatInTimeZone(defaultDateBase, teacherTimezone, "yyyy-MM-dd");
  const defaultStartTimeLocal = formatInTimeZone(session.startsAtUtc, teacherTimezone, "HH:mm");

  return (
    <AppShell role={viewer.role} activePath="/teacher/schedule" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={session.studentId}>
      <PageIntro
        eyebrow={isSpanish ? "Reagendar clase" : "Reschedule class"}
        title={isSpanish ? "Confirma el nuevo horario de esta clase." : "Confirm the new time for this class."}
        description={isSpanish ? "El cambio aplica solo a esta clase y no modifica la serie recurrente." : "This change applies only to this class and does not change the recurring series."}
      />

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardTitle>{session.student.user.name}</CardTitle>
          <CardDescription>{classTypeLabel(session.type, viewer.locale)} · {classStatusLabel(session.status, viewer.locale)}</CardDescription>
          <div className="mt-4 grid gap-3">
            <Info label={isSpanish ? "Hora original docente" : "Original teacher time"} value={`${formatDateTimeInZone(session.startsAtUtc, teacherTimezone, viewer.locale)} (${teacherTimezone})`} />
            <Info label={isSpanish ? "Hora original estudiante" : "Original student time"} value={`${formatDateTimeInZone(session.startsAtUtc, studentTimezone, viewer.locale)} (${studentTimezone})`} />
            <Info label={isSpanish ? "Duración actual" : "Current duration"} value={`${durationMin} min`} />
          </div>
          {session.rescheduleRequests.length ? (
            <div className="mt-4 rounded-[1.1rem] border border-amber-200/80 bg-amber-50/72 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                {isSpanish ? "Solicitudes pendientes" : "Pending requests"}
              </p>
              <div className="mt-2 space-y-2">
                {session.rescheduleRequests.map((request) => (
                  <p key={request.id} className="text-sm leading-6 text-amber-950/80">
                    {request.studentMessage || (isSpanish ? "Sin mensaje del estudiante." : "No student message.")}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Nuevo horario" : "New time"}</CardTitle>
          <CardDescription>
            {isSpanish
              ? "Validaremos disponibilidad, cruces, bloqueos y que la fecha sea futura."
              : "We will validate availability, conflicts, blackout dates, and that the time is in the future."}
          </CardDescription>
          <div className="mt-4">
            <DirectRescheduleForm
              classId={session.id}
              defaultDate={defaultDate}
              defaultStartTimeLocal={defaultStartTimeLocal}
              defaultDurationMin={durationMin}
              teacherTimezone={teacherTimezone}
              studentTimezone={studentTimezone}
              locale={viewer.locale}
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold-deep)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
