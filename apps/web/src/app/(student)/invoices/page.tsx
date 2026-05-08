import { Role } from "@prisma/client";

import { StudentInvoiceSyncButton } from "@/components/invoices/student-invoice-sync-button";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentInvoicesView } from "@/features/invoices/data";
import { formatDate, formatMoney, getDictionary, intlLocale } from "@/lib/i18n";

export default async function StudentInvoicesPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const dictionary = getDictionary(viewer.locale);
  const data = await getStudentInvoicesView(viewer.studentProfileId!);

  return (
    <AppShell role={viewer.role} activePath="/invoices" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.shell.nav.billing}
        title={viewer.locale === "es" ? "Tus facturas mensuales en un solo lugar." : "Your monthly invoices in one place."}
        description={viewer.locale === "es" ? "Sincronizamos tus comprobantes desde Alegra para que puedas ver estado, montos y descargar PDF cuando esté disponible." : "We sync your invoices from Alegra so you can review status, amounts, and download PDFs when available."}
      >
        <StudentInvoiceSyncButton locale={viewer.locale} />
      </PageIntro>

      {data.isDemoMode ? (
        <Card>
          <CardTitle>{viewer.locale === "es" ? "Modo demo de facturación" : "Billing demo mode"}</CardTitle>
          <CardDescription>
            {viewer.locale === "es" ? "Alegra aún no está conectado. Mostramos facturas de ejemplo en cache para que puedas validar la experiencia." : "Alegra is not connected yet. We show sample cached invoices so you can validate the experience."}
          </CardDescription>
        </Card>
      ) : null}

      {data.isStale ? (
        <Card>
          <CardTitle>{viewer.locale === "es" ? "Datos por actualizar" : "Data needs updating"}</CardTitle>
          <CardDescription>
            {data.lastSyncedAt
              ? `${viewer.locale === "es" ? "Última sincronización" : "Last sync"}: ${new Date(data.lastSyncedAt).toLocaleString(intlLocale(viewer.locale))}`
              : viewer.locale === "es" ? "Aún no se ha completado la primera sincronización." : "The first sync has not completed yet."}
          </CardDescription>
          {data.link?.lastError ? <p className="mt-2 text-sm text-rose-700">{data.link.lastError}</p> : null}
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{viewer.locale === "es" ? "Mis facturas" : "My invoices"}</CardTitle>
            <CardDescription>{viewer.locale === "es" ? "Total en cache" : "Cached total"}: {data.totalInvoices}</CardDescription>
          </div>
          {data.latestRun ? <Badge variant="default">{viewer.locale === "es" ? "Última corrida" : "Latest run"}: {data.latestRun.status}</Badge> : null}
        </div>

        <div className="mt-4 space-y-2">
          {data.invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {viewer.locale === "es" ? "Factura" : "Invoice"} {invoice.invoiceNumber ?? invoice.alegraInvoiceId}
                </p>
                <Badge variant={invoice.balanceAmount && Number(invoice.balanceAmount) > 0 ? "warning" : "success"}>
                  {invoice.status}
                </Badge>
              </div>

              <div className="mt-2 grid gap-1 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2 lg:grid-cols-4">
                <p>{viewer.locale === "es" ? "Emisión" : "Issued"}: {invoice.issueDate ? formatDate(invoice.issueDate, viewer.locale) : "-"}</p>
                <p>{viewer.locale === "es" ? "Vencimiento" : "Due"}: {invoice.dueDate ? formatDate(invoice.dueDate, viewer.locale) : "-"}</p>
                <p>Total: {formatMoney(invoice.totalAmount, invoice.currency, viewer.locale)}</p>
                <p>{viewer.locale === "es" ? "Saldo" : "Balance"}: {formatMoney(invoice.balanceAmount, invoice.currency, viewer.locale)}</p>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {invoice.viewUrl ? (
                  <a href={invoice.viewUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">{viewer.locale === "es" ? "Ver factura" : "View invoice"}</Button>
                  </a>
                ) : null}
                {invoice.pdfUrl ? (
                  <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                    <Button size="sm" variant="gold" className="w-full sm:w-auto">{viewer.locale === "es" ? "Descargar PDF" : "Download PDF"}</Button>
                  </a>
                ) : null}
              </div>
            </div>
          ))}

          {!data.invoices.length ? (
            <p className="rounded-[1.1rem] border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-ink-soft)]">
              {viewer.locale === "es" ? "Aún no hay facturas." : "No invoices yet."}
            </p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
