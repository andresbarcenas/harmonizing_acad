import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { RequestActions } from "@/components/schedule/request-actions";
import { requireViewer } from "@/features/auth/server";
import { getTeacherRequestsData } from "@/lib/data";
import { formatDateTimeInZone, getDictionary } from "@/lib/i18n";

type TeacherRequestsPageProps = {
  searchParams?: Promise<{
    studentId?: string;
  }>;
};

export default async function TeacherRequestsPage({ searchParams }: TeacherRequestsPageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const dictionary = getDictionary(viewer.locale);
  const resolvedSearchParams = await searchParams;
  const { requests, selectedStudentId } = await getTeacherRequestsData(viewer, { studentId: resolvedSearchParams?.studentId });

  return (
    <AppShell role={viewer.role} activePath="/teacher/requests" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={selectedStudentId}>
      <PageIntro
        eyebrow={dictionary.shell.nav.reschedules}
        title={viewer.locale === "es" ? "Aprueba cambios con contexto y sin fricción." : "Approve changes with context and less friction."}
        description={viewer.locale === "es" ? "Cada solicitud muestra la clase original, la propuesta nueva y el mensaje del estudiante para ayudarte a decidir con rapidez." : "Each request shows the original class, new proposal, and student message so you can decide quickly."}
      />

      <Card>
        <CardTitle>{dictionary.teacher.pendingRequests}</CardTitle>
        <CardDescription>{viewer.locale === "es" ? "Aprueba o rechaza cambios con un clic." : "Approve or reject changes in one click."}</CardDescription>
        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-[1.3rem] border border-[var(--color-border)] bg-white/68 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{request.session.student.user.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {viewer.locale === "es" ? "Original docente" : "Original teacher time"}: {formatDateTimeInZone(request.session.startsAtUtc, viewer.timezone, viewer.locale)} ({viewer.timezone})
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {viewer.locale === "es" ? "Original estudiante" : "Original student time"}: {formatDateTimeInZone(request.session.startsAtUtc, request.session.student.user.timezone, viewer.locale)} ({request.session.student.user.timezone})
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {viewer.locale === "es" ? "Propuesto docente" : "Proposed teacher time"}: {formatDateTimeInZone(request.proposedStartUtc, viewer.timezone, viewer.locale)} ({viewer.timezone})
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {viewer.locale === "es" ? "Propuesto estudiante" : "Proposed student time"}: {formatDateTimeInZone(request.proposedStartUtc, request.session.student.user.timezone, viewer.locale)} ({request.session.student.user.timezone})
                  </p>
                </div>
                <Badge variant="warning">{dictionary.common.pending}</Badge>
              </div>
              <p className="mt-2 break-words text-sm">{request.studentMessage}</p>
              <div className="mt-3">
                <RequestActions requestId={request.id} locale={viewer.locale} />
              </div>
            </div>
          ))}
          {!requests.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.teacher.noRequests}</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
