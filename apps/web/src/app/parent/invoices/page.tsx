import { Role } from "@prisma/client";

import { StudentInvoiceSyncButton } from "@/components/invoices/student-invoice-sync-button";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentInvoicesView } from "@/features/invoices/data";
import { formatDate, formatMoney, intlLocale } from "@/lib/i18n";
import { resolveParentStudentSelection } from "@/lib/parents";

export default async function ParentInvoicesPage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const selectedStudentId = selection.selectedStudentId;
  const isSpanish = viewer.locale === "es";

  if (!selectedStudentId) {
    return (
      <AppShell role={viewer.role} activePath="/parent/invoices" userName={viewer.name} locale={viewer.locale}>
        <PageIntro eyebrow={isSpanish ? "Facturas familiares" : "Family invoices"} title={isSpanish ? "Aún no hay estudiantes vinculados." : "No linked students yet."} description={isSpanish ? "Administración puede vincular estudiantes a esta cuenta familiar." : "An admin can link students to this family account."} />
      </AppShell>
    );
  }

  const data = await getStudentInvoicesView(selectedStudentId);
  const student = selection.selectedLink?.student;

  return (
    <AppShell role={viewer.role} activePath="/parent/invoices" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selectedStudentId}>
      <PageIntro
        eyebrow={isSpanish ? "Facturación" : "Billing"}
        title={isSpanish ? `Facturas de ${student?.user.name ?? "estudiante"}` : `${student?.user.name ?? "Student"} invoices`}
        description={data.isConfigured
          ? isSpanish ? "Sincronizamos comprobantes desde Alegra por estudiante." : "We sync invoices from Alegra per student."
          : isSpanish ? "Esta sección estará disponible cuando la integración de facturación esté activa." : "This section will be available when invoice integration is active."}
      >
        {data.isConfigured ? <StudentInvoiceSyncButton locale={viewer.locale} studentId={selectedStudentId} /> : null}
      </PageIntro>

      {!data.isConfigured ? (
        <Card>
          <CardTitle>{isSpanish ? "Las facturas aún no están configuradas." : "Invoices are not configured yet."}</CardTitle>
          <CardDescription>{isSpanish ? "El equipo de Harmonizing activará esta sección cuando la integración de facturación esté lista." : "The Harmonizing team will enable this section when invoice integration is ready."}</CardDescription>
        </Card>
      ) : (
        <>
          {data.isStale ? (
            <Card>
              <CardTitle>{isSpanish ? "Datos por actualizar" : "Data needs updating"}</CardTitle>
              <CardDescription>{data.lastSyncedAt ? `${isSpanish ? "Última sincronización" : "Last sync"}: ${new Date(data.lastSyncedAt).toLocaleString(intlLocale(viewer.locale))}` : isSpanish ? "Aún no se ha completado la primera sincronización." : "The first sync has not completed yet."}</CardDescription>
              {data.link?.lastError ? <p className="mt-2 text-sm text-rose-700">{data.link.lastError}</p> : null}
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><CardTitle>{isSpanish ? "Facturas" : "Invoices"}</CardTitle><CardDescription>{isSpanish ? "Total sincronizado" : "Synced total"}: {data.totalInvoices}</CardDescription></div>
              {data.latestRun ? <Badge variant="default">{isSpanish ? "Última corrida" : "Latest run"}: {data.latestRun.status}</Badge> : null}
            </div>
            <div className="mt-4 space-y-2">
              {data.invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[var(--color-ink)]">{isSpanish ? "Factura" : "Invoice"} {invoice.invoiceNumber ?? invoice.alegraInvoiceId}</p><Badge variant={invoice.balanceAmount && Number(invoice.balanceAmount) > 0 ? "warning" : "success"}>{invoice.status}</Badge></div>
                  <div className="mt-2 grid gap-1 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2 lg:grid-cols-4">
                    <p>{isSpanish ? "Emisión" : "Issued"}: {invoice.issueDate ? formatDate(invoice.issueDate, viewer.locale) : "-"}</p>
                    <p>{isSpanish ? "Vencimiento" : "Due"}: {invoice.dueDate ? formatDate(invoice.dueDate, viewer.locale) : "-"}</p>
                    <p>Total: {formatMoney(invoice.totalAmount, invoice.currency, viewer.locale)}</p>
                    <p>{isSpanish ? "Saldo" : "Balance"}: {formatMoney(invoice.balanceAmount, invoice.currency, viewer.locale)}</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {invoice.viewUrl ? <a href={invoice.viewUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto"><Button size="sm" variant="outline" className="w-full sm:w-auto">{isSpanish ? "Ver factura" : "View invoice"}</Button></a> : null}
                    {invoice.pdfUrl ? <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto"><Button size="sm" variant="gold" className="w-full sm:w-auto">{isSpanish ? "Descargar PDF" : "Download PDF"}</Button></a> : null}
                  </div>
                </div>
              ))}
              {!data.invoices.length ? <p className="rounded-[1.1rem] border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-ink-soft)]">{isSpanish ? "Aún no hay facturas." : "No invoices yet."}</p> : null}
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}
