import { Role } from "@prisma/client";

import { AdminInvoicesPanel } from "@/components/invoices/admin-invoices-panel";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminInvoicesOverview } from "@/features/invoices/data";
import { getDictionary } from "@/lib/i18n";

export default async function AdminInvoicesPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);
  const data = await getAdminInvoicesOverview();

  return (
    <AppShell role={viewer.role} activePath="/admin/invoices" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.shell.nav.billing}
        title={viewer.locale === "es" ? "Supervisa sincronización de facturas desde Alegra." : "Monitor invoice sync from Alegra."}
        description={data.isConfigured
          ? viewer.locale === "es" ? "Controla estado por estudiante, ejecuta sincronización manual y ajusta el contacto Alegra cuando sea necesario." : "Track status by student, run manual sync, and adjust Alegra contacts when needed."
          : viewer.locale === "es" ? "Esta sección está lista para usarse cuando se configuren las credenciales de facturación." : "This section is ready once invoice credentials are configured."}
      />

      <Card>
        <CardTitle>{viewer.locale === "es" ? "Monitor de facturación" : "Billing monitor"}</CardTitle>
        <CardDescription>
          {data.isConfigured
            ? viewer.locale === "es" ? "V1 es de solo lectura: mostramos facturas importadas de Alegra, sin cobro interno en Harmonizing." : "V1 is read-only: we show invoices imported from Alegra without internal Harmonizing payments."
            : viewer.locale === "es" ? "Las facturas aún no están configuradas." : "Invoices are not configured yet."}
        </CardDescription>
        {!data.isConfigured ? (
          <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
            {viewer.locale === "es"
              ? "Cuando la integración esté lista, esta página mostrará sincronización, enlaces de contacto y facturas reales."
              : "When the integration is ready, this page will show sync status, contact links, and real invoices."}
          </p>
        ) : null}
      </Card>

      {data.isConfigured ? (
        <AdminInvoicesPanel
          rows={data.rows.map((row) => ({
            ...row,
            lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
            link: row.link
              ? {
                  alegraContactId: row.link.alegraContactId,
                  strategy: row.link.strategy,
                  lastError: row.link.lastError,
                }
              : null,
            latestRun: row.latestRun
              ? {
                  status: row.latestRun.status,
                  startedAt: row.latestRun.startedAt.toISOString(),
                  errorSummary: row.latestRun.errorSummary,
                }
              : null,
          }))}
          latestAllRun={
            data.latestAllRun
              ? {
                  status: data.latestAllRun.status,
                  startedAt: data.latestAllRun.startedAt.toISOString(),
                  finishedAt: data.latestAllRun.finishedAt?.toISOString() ?? null,
                  studentsProcessed: data.latestAllRun.studentsProcessed,
                  studentsFailed: data.latestAllRun.studentsFailed,
                  invoicesUpserted: data.latestAllRun.invoicesUpserted,
                  errorSummary: data.latestAllRun.errorSummary,
                }
              : null
          }
          locale={viewer.locale}
        />
      ) : null}
    </AppShell>
  );
}
