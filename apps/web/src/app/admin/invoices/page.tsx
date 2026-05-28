import { NativeInvoiceStatus, Role } from "@prisma/client";

import { AdminInvoicesPanel } from "@/components/invoices/admin-invoices-panel";
import { NativeInvoiceAdminPanel } from "@/components/invoices/native-invoice-admin-panel";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminInvoicesOverview } from "@/features/invoices/data";
import { getDictionary } from "@/lib/i18n";
import { getAdminNativeInvoiceWorkspace } from "@/lib/native-invoices/service";

export default async function AdminInvoicesPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);
  const [nativeData, alegraData] = await Promise.all([
    getAdminNativeInvoiceWorkspace(),
    getAdminInvoicesOverview(),
  ]);

  const summaryMap = new Map(nativeData.summary.map((row) => [row.status, row]));
  const creditBalanceMap = new Map(nativeData.creditBalances.map((row) => [row.studentId, row._sum.delta ?? 0]));
  type CreditEntry = (typeof nativeData.creditEntries)[number];
  const creditEntriesByStudent = new Map<string, CreditEntry[]>();
  for (const entry of nativeData.creditEntries) {
    const existing = creditEntriesByStudent.get(entry.studentId) ?? [];
    if (existing.length < 8) existing.push(entry);
    creditEntriesByStudent.set(entry.studentId, existing);
  }
  const summary = Object.values(NativeInvoiceStatus).map((status) => {
    const row = summaryMap.get(status);
    return {
      status,
      count: row?._count.id ?? 0,
      totalCop: row?._sum.totalCop ?? 0,
      balanceCop: row?._sum.balanceCop ?? 0,
    };
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/invoices" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.shell.nav.billing}
        title={viewer.locale === "es" ? "Facturación Harmonizing." : "Harmonizing invoicing."}
        description={viewer.locale === "es"
          ? "Crea facturas mensuales, genera PDFs privados, envíalas por correo y administra su estado. Alegra queda como referencia externa durante la transición."
          : "Create monthly invoices, generate private PDFs, send them by email, and manage status. Alegra remains as an external reference during the transition."}
      />

      <NativeInvoiceAdminPanel
        locale={viewer.locale}
        students={nativeData.students.map((student) => ({
          id: student.id,
          name: student.user.name,
          email: student.user.email,
          billingProfile: student.billingProfile
            ? {
                defaultSessionCount: student.billingProfile.defaultSessionCount,
                pricePerClassCop: student.billingProfile.pricePerClassCop,
                notes: student.billingProfile.notes,
                autoGenerateEnabled: student.billingProfile.autoGenerateEnabled,
              }
            : null,
          primaryParent: student.parentLinks[0]
            ? { name: student.parentLinks[0].parent.user.name, email: student.parentLinks[0].parent.user.email }
            : null,
        }))}
        invoices={nativeData.invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          studentId: invoice.studentId,
          studentNameSnapshot: invoice.studentNameSnapshot,
          recipientName: invoice.recipientName,
          recipientEmail: invoice.recipientEmail,
          status: invoice.status,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          periodStart: invoice.periodStart.toISOString(),
          periodEnd: invoice.periodEnd.toISOString(),
          sessionCount: invoice.sessionCount,
          pricePerClassCop: invoice.pricePerClassCop,
          totalCop: invoice.totalCop,
          balanceCop: invoice.balanceCop,
          emailStatus: invoice.emailStatus,
          emailError: invoice.emailError,
          pdfGeneratedAt: invoice.pdfGeneratedAt?.toISOString() ?? null,
          payments: invoice.payments.map((payment) => ({
            id: payment.id,
            amountCop: payment.amountCop,
            method: payment.method,
            paymentDate: payment.paymentDate.toISOString(),
            reference: payment.reference,
            notes: payment.notes,
            status: payment.status,
            voidReason: payment.voidReason,
            attachments: payment.attachments.map((attachment) => ({
              id: attachment.id,
              originalName: attachment.originalName,
            })),
          })),
          creditBalance: creditBalanceMap.get(invoice.studentId) ?? 0,
          creditEntries: (creditEntriesByStudent.get(invoice.studentId) ?? []).map((entry) => ({
            id: entry.id,
            type: entry.type,
            delta: entry.delta,
            reason: entry.reason,
            note: entry.note,
            effectiveAt: entry.effectiveAt.toISOString(),
            invoiceNumber: entry.invoice?.invoiceNumber ?? null,
            classStartsAt: entry.classSession?.startsAtUtc.toISOString() ?? null,
          })),
        }))}
        summary={summary}
      />

      <Card>
        <CardTitle>{viewer.locale === "es" ? "Registros externos de Alegra" : "External Alegra records"}</CardTitle>
        <CardDescription>
          {alegraData.isConfigured
            ? viewer.locale === "es" ? "Usa esta sección como referencia, para sincronizar históricos o ajustar el contacto Alegra mientras migramos a facturación nativa." : "Use this section as a reference for historical syncs or contact linking while native invoicing becomes primary."
            : viewer.locale === "es" ? "Alegra aún no está configurado en este entorno." : "Alegra is not configured in this environment."}
        </CardDescription>
      </Card>

      {alegraData.isConfigured ? (
        <AdminInvoicesPanel
          rows={alegraData.rows.map((row) => ({
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
            alegraData.latestAllRun
              ? {
                  status: alegraData.latestAllRun.status,
                  startedAt: alegraData.latestAllRun.startedAt.toISOString(),
                  finishedAt: alegraData.latestAllRun.finishedAt?.toISOString() ?? null,
                  studentsProcessed: alegraData.latestAllRun.studentsProcessed,
                  studentsFailed: alegraData.latestAllRun.studentsFailed,
                  invoicesUpserted: alegraData.latestAllRun.invoicesUpserted,
                  errorSummary: alegraData.latestAllRun.errorSummary,
                }
              : null
          }
          locale={viewer.locale}
        />
      ) : null}
    </AppShell>
  );
}
