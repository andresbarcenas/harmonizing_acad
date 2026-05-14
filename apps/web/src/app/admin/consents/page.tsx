import Link from "next/link";
import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { consentEmailStatusLabel, getActiveConsentDocument } from "@/lib/consent/service";
import { db } from "@/lib/db";
import { formatDateTimeInZone } from "@/lib/i18n";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminConsentsPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.ADMIN]);
  const params = await searchParams;
  const filter = params?.status ?? "all";
  const isSpanish = viewer.locale === "es";
  const document = await getActiveConsentDocument();
  const students = await db.studentProfile.findMany({
    include: {
      user: {
        include: {
          consentSignatures: {
            where: { documentId: document.id },
            orderBy: { signedAt: "desc" },
            take: 1,
          },
        },
      },
      assignment: {
        include: { teacher: { include: { user: true } } },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const rows = students
    .map((student) => ({ student, signature: student.user.consentSignatures[0] ?? null }))
    .filter((row) => {
      if (filter === "signed") return Boolean(row.signature);
      if (filter === "missing") return !row.signature;
      if (filter === "email_failed") return row.signature?.emailStatus === "FAILED";
      return true;
    });

  const signedCount = students.filter((student) => student.user.consentSignatures.length > 0).length;
  const failedCount = students.filter((student) => student.user.consentSignatures[0]?.emailStatus === "FAILED").length;

  return (
    <AppShell role={viewer.role} activePath="/admin/consents" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Privacidad y consentimiento" : "Privacy and consent"}
        title={isSpanish ? "Control de consentimientos firmados." : "Signed consent tracking."}
        description={isSpanish ? "Revisa quién ya firmó, quién sigue pendiente y si la copia PDF fue enviada correctamente." : "Review who has signed, who is pending, and whether the PDF copy was emailed successfully."}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={isSpanish ? "Estudiantes" : "Students"} value={students.length} />
        <SummaryCard label={isSpanish ? "Firmados" : "Signed"} value={signedCount} />
        <SummaryCard label={isSpanish ? "Email fallido" : "Email failed"} value={failedCount} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{isSpanish ? "Consentimiento activo" : "Active consent"}</CardTitle>
            <CardDescription>{document.version} · {isSpanish ? document.titleEs : document.titleEn}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterLink active={filter === "all"} href="/admin/consents" label={isSpanish ? "Todos" : "All"} />
            <FilterLink active={filter === "signed"} href="/admin/consents?status=signed" label={isSpanish ? "Firmados" : "Signed"} />
            <FilterLink active={filter === "missing"} href="/admin/consents?status=missing" label={isSpanish ? "Pendientes" : "Missing"} />
            <FilterLink active={filter === "email_failed"} href="/admin/consents?status=email_failed" label={isSpanish ? "Email fallido" : "Email failed"} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {rows.map(({ student, signature }) => (
            <div key={student.id} className="grid gap-3 rounded-[1.3rem] border border-[var(--color-border)] bg-white/70 p-4 lg:grid-cols-[1.1fr_0.9fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{student.user.name}</p>
                <p className="truncate text-xs text-[var(--color-ink-soft)]">{student.user.email}</p>
                <p className="truncate text-xs text-[var(--color-ink-soft)]">
                  {isSpanish ? "Docente" : "Teacher"}: {student.assignment?.teacher.user.name ?? (isSpanish ? "Sin asignar" : "Unassigned")}
                </p>
              </div>
              <div className="min-w-0">
                {signature ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">{isSpanish ? "Firmado" : "Signed"}</Badge>
                      <Badge variant={signature.emailStatus === "FAILED" ? "danger" : "default"}>{consentEmailStatusLabel(signature.emailStatus, viewer.locale)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                      {signature.signerName} · {signature.signerRelationship}
                    </p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(signature.signedAt, viewer.timezone, viewer.locale)}</p>
                    {signature.emailError ? <p className="mt-1 text-xs text-rose-700">{signature.emailError}</p> : null}
                  </>
                ) : (
                  <Badge>{isSpanish ? "Pendiente" : "Missing"}</Badge>
                )}
              </div>
              <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {signature ? (
                  <a href={`/api/consent/signatures/${signature.id}/pdf`}>
                    <Button type="button" size="sm" variant="outline">{isSpanish ? "Descargar PDF" : "Download PDF"}</Button>
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {!rows.length ? <CardDescription>{isSpanish ? "No hay estudiantes para este filtro." : "No students match this filter."}</CardDescription> : null}
        </div>
      </Card>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p>
      <p className="mt-2 font-display text-4xl tracking-[-0.05em] text-[var(--color-ink)]">{value}</p>
    </Card>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <Button type="button" size="sm" variant={active ? "gold" : "outline"}>{label}</Button>
    </Link>
  );
}
