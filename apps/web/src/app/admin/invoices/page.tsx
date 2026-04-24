import { Role } from "@prisma/client";

import { AdminInvoicesPanel } from "@/components/invoices/admin-invoices-panel";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminInvoicesOverview } from "@/features/invoices/data";

export default async function AdminInvoicesPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const data = await getAdminInvoicesOverview();

  return (
    <AppShell role={viewer.role} activePath="/admin/invoices" userName={viewer.name}>
      <PageIntro
        eyebrow="Facturación"
        title="Supervisa sincronización de facturas desde Alegra."
        description="Controla estado por estudiante, ejecuta sincronización manual y ajusta el contacto Alegra cuando sea necesario."
      />

      <Card>
        <CardTitle>Monitor de facturación</CardTitle>
        <CardDescription>
          V1 es de solo lectura: mostramos facturas importadas de Alegra, sin cobro interno en Harmonizing.
        </CardDescription>
        {data.isDemoMode ? (
          <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
            Modo demo activo: la conexión con Alegra no está configurada y se muestran facturas locales en cache.
          </p>
        ) : null}
      </Card>

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
        isDemoMode={data.isDemoMode}
      />
    </AppShell>
  );
}
