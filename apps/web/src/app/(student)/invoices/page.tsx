import { Role } from "@prisma/client";

import { StudentInvoiceSyncButton } from "@/components/invoices/student-invoice-sync-button";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentInvoicesView } from "@/features/invoices/data";

function formatMoney(value: unknown, currency: string) {
  const numeric = value === null || value === undefined ? null : Number(value);
  if (numeric === null || Number.isNaN(numeric)) return "-";

  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export default async function StudentInvoicesPage() {
  const viewer = await requireViewer([Role.STUDENT]);
  const data = await getStudentInvoicesView(viewer.studentProfileId!);

  return (
    <AppShell role={viewer.role} activePath="/invoices" userName={viewer.name}>
      <PageIntro
        eyebrow="Facturación"
        title="Tus facturas mensuales en un solo lugar."
        description="Sincronizamos tus comprobantes desde Alegra para que puedas ver estado, montos y descargar PDF cuando esté disponible."
      >
        <StudentInvoiceSyncButton />
      </PageIntro>

      {data.isDemoMode ? (
        <Card>
          <CardTitle>Modo demo de facturación</CardTitle>
          <CardDescription>
            Alegra aún no está conectado. Mostramos facturas de ejemplo en cache para que puedas validar la experiencia.
          </CardDescription>
        </Card>
      ) : null}

      {data.isStale ? (
        <Card>
          <CardTitle>Datos por actualizar</CardTitle>
          <CardDescription>
            {data.lastSyncedAt
              ? `Última sincronización: ${new Date(data.lastSyncedAt).toLocaleString("es-US")}`
              : "Aún no se ha completado la primera sincronización."}
          </CardDescription>
          {data.link?.lastError ? <p className="mt-2 text-sm text-rose-700">{data.link.lastError}</p> : null}
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Mis facturas</CardTitle>
            <CardDescription>Total en cache: {data.totalInvoices}</CardDescription>
          </div>
          {data.latestRun ? <Badge variant="default">Última corrida: {data.latestRun.status}</Badge> : null}
        </div>

        <div className="mt-4 space-y-2">
          {data.invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Factura {invoice.invoiceNumber ?? invoice.alegraInvoiceId}
                </p>
                <Badge variant={invoice.balanceAmount && Number(invoice.balanceAmount) > 0 ? "warning" : "success"}>
                  {invoice.status}
                </Badge>
              </div>

              <div className="mt-2 grid gap-1 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2 lg:grid-cols-4">
                <p>Emisión: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("es-US") : "-"}</p>
                <p>Vencimiento: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("es-US") : "-"}</p>
                <p>Total: {formatMoney(invoice.totalAmount, invoice.currency)}</p>
                <p>Saldo: {formatMoney(invoice.balanceAmount, invoice.currency)}</p>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {invoice.viewUrl ? (
                  <a href={invoice.viewUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">Ver factura</Button>
                  </a>
                ) : null}
                {invoice.pdfUrl ? (
                  <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                    <Button size="sm" variant="gold" className="w-full sm:w-auto">Descargar PDF</Button>
                  </a>
                ) : null}
              </div>
            </div>
          ))}

          {!data.invoices.length ? (
            <p className="rounded-[1.1rem] border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-ink-soft)]">
              Aún no hay facturas.
            </p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
