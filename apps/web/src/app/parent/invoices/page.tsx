import { NativeInvoiceStatus, Role } from "@prisma/client";
import Link from "next/link";

import { StudentInvoiceSyncButton } from "@/components/invoices/student-invoice-sync-button";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentInvoicesView } from "@/features/invoices/data";
import { formatDate, formatMoney, intlLocale } from "@/lib/i18n";
import { formatCop } from "@/lib/native-invoices/shared";
import { resolveParentStudentSelection } from "@/lib/parents";

function statusVariant(status: NativeInvoiceStatus) {
  if (status === NativeInvoiceStatus.PAID) return "success" as const;
  if (status === NativeInvoiceStatus.OPEN) return "warning" as const;
  if (status === NativeInvoiceStatus.VOID) return "danger" as const;
  return "default" as const;
}

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
        description={isSpanish
          ? "Facturas Harmonizing, PDFs privados y registros externos de Alegra cuando existan."
          : "Harmonizing invoices, private PDFs, and external Alegra records when available."}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><CardTitle>{isSpanish ? "Facturas Harmonizing" : "Harmonizing invoices"}</CardTitle><CardDescription>{isSpanish ? "Documentos internos de cobro emitidos por la academia." : "Internal billing documents issued by the academy."}</CardDescription></div>
          <Badge variant="gold">COP</Badge>
        </div>
        <div className="mt-4 space-y-2">
          {data.nativeInvoices.map((invoice) => (
            <div key={invoice.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[var(--color-ink)]">{isSpanish ? "Factura" : "Invoice"} {invoice.invoiceNumber}</p><Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge></div>
              <div className="mt-2 grid gap-1 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2 lg:grid-cols-4">
                <p>{isSpanish ? "Periodo" : "Period"}: {formatDate(invoice.periodStart, viewer.locale)} - {formatDate(invoice.periodEnd, viewer.locale)}</p>
                <p>{isSpanish ? "Vencimiento" : "Due"}: {formatDate(invoice.dueDate, viewer.locale)}</p>
                <p>{isSpanish ? "Sesiones" : "Sessions"}: {invoice.sessionCount}</p>
                <p>Total: {formatCop(invoice.totalCop, viewer.locale)}</p>
                <p>{isSpanish ? "Pagado" : "Paid"}: {formatCop(Math.max(invoice.totalCop - invoice.balanceCop, 0), viewer.locale)}</p>
                <p>{isSpanish ? "Saldo" : "Balance"}: {formatCop(invoice.balanceCop, viewer.locale)}</p>
              </div>
              {invoice.payments.length ? (
                <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">{isSpanish ? "Pagos registrados" : "Recorded payments"}</p>
                  <div className="mt-2 space-y-2">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-soft)]">
                        <span>{formatDate(payment.paymentDate, viewer.locale)} · {formatCop(payment.amountCop, viewer.locale)}</span>
                        <span className="flex flex-wrap gap-2">
                          {payment.attachments.map((attachment) => (
                            <Link key={attachment.id} href={`/api/invoices/native/payments/attachments/${attachment.id}`} target="_blank" className="font-semibold text-[var(--color-gold-deep)] underline-offset-4 hover:underline">
                              {attachment.originalName}
                            </Link>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Link href={`/api/invoices/native/${invoice.id}/pdf`} target="_blank" className="w-full sm:w-auto"><Button size="sm" variant="gold" className="w-full sm:w-auto">{isSpanish ? "Descargar PDF" : "Download PDF"}</Button></Link></div>
            </div>
          ))}
          {!data.nativeInvoices.length ? <p className="rounded-[1.1rem] border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-ink-soft)]">{isSpanish ? "Aún no hay facturas emitidas por Harmonizing." : "No Harmonizing invoices have been issued yet."}</p> : null}
        </div>
      </Card>

      <Card variant="subtle">
        <CardTitle>{isSpanish ? "Créditos de clase" : "Class credits"}</CardTitle>
        <CardDescription>{isSpanish ? "Balance y uso de clases facturadas para este estudiante." : "Balance and usage of invoiced class credits for this student."}</CardDescription>
        <p className="mt-3 font-display text-3xl text-[var(--color-ink)]">{data.creditSummary.balance}</p>
        <div className="mt-3 space-y-2">
          {data.creditSummary.entries.slice(0, 8).map((entry) => (
            <div key={entry.id} className="rounded-[1rem] border border-[var(--color-border)] bg-white/68 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
              <span className="font-semibold text-[var(--color-ink)]">{entry.delta > 0 ? "+" : ""}{entry.delta}</span>
              {" · "}{entry.reason ?? entry.type.replaceAll("_", " ")}
            </div>
          ))}
          {!data.creditSummary.entries.length ? <p className="text-sm text-[var(--color-ink-soft)]">{isSpanish ? "Aún no hay movimientos de créditos." : "No credit activity yet."}</p> : null}
        </div>
      </Card>

      <Card variant="subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><CardTitle>{isSpanish ? "Registros externos de Alegra" : "External Alegra records"}</CardTitle><CardDescription>{data.isConfigured ? (isSpanish ? "Referencia histórica sincronizada desde Alegra." : "Historical reference synced from Alegra.") : (isSpanish ? "Alegra aún no está configurado." : "Alegra is not configured yet.")}</CardDescription></div>
          {data.isConfigured ? <StudentInvoiceSyncButton locale={viewer.locale} studentId={selectedStudentId} /> : null}
        </div>

        {data.isConfigured ? (
          <>
            {data.isStale ? <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-white/68 px-3 py-2 text-xs text-[var(--color-ink-soft)]">{data.lastSyncedAt ? `${isSpanish ? "Última sincronización" : "Last sync"}: ${new Date(data.lastSyncedAt).toLocaleString(intlLocale(viewer.locale))}` : isSpanish ? "Aún no se ha completado la primera sincronización." : "The first sync has not completed yet."}{data.link?.lastError ? <p className="mt-1 text-rose-700">{data.link.lastError}</p> : null}</div> : null}
            <div className="mt-4 space-y-2">
              {data.invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[var(--color-ink)]">{isSpanish ? "Factura Alegra" : "Alegra invoice"} {invoice.invoiceNumber ?? invoice.alegraInvoiceId}</p><Badge variant={invoice.balanceAmount && Number(invoice.balanceAmount) > 0 ? "warning" : "success"}>{invoice.status}</Badge></div>
                  <div className="mt-2 grid gap-1 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2 lg:grid-cols-4">
                    <p>{isSpanish ? "Emisión" : "Issued"}: {invoice.issueDate ? formatDate(invoice.issueDate, viewer.locale) : "-"}</p>
                    <p>{isSpanish ? "Vencimiento" : "Due"}: {invoice.dueDate ? formatDate(invoice.dueDate, viewer.locale) : "-"}</p>
                    <p>Total: {formatMoney(invoice.totalAmount, invoice.currency, viewer.locale)}</p>
                    <p>{isSpanish ? "Saldo" : "Balance"}: {formatMoney(invoice.balanceAmount, invoice.currency, viewer.locale)}</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">{invoice.viewUrl ? <a href={invoice.viewUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto"><Button size="sm" variant="outline" className="w-full sm:w-auto">{isSpanish ? "Ver factura" : "View invoice"}</Button></a> : null}{invoice.pdfUrl ? <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto"><Button size="sm" variant="outline" className="w-full sm:w-auto">{isSpanish ? "PDF Alegra" : "Alegra PDF"}</Button></a> : null}</div>
                </div>
              ))}
              {!data.invoices.length ? <p className="rounded-[1.1rem] border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-ink-soft)]">{isSpanish ? "No hay registros externos sincronizados." : "No external records synced yet."}</p> : null}
            </div>
          </>
        ) : null}
      </Card>
    </AppShell>
  );
}
