"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClassCreditLedgerEntryType, EmailDeliveryStatus, NativeInvoicePaymentMethod, NativeInvoicePaymentStatus, NativeInvoiceStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PRICE_PER_CLASS_COP, formatCop } from "@/lib/native-invoices/shared";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";

type StudentOption = {
  id: string;
  name: string;
  email: string;
  billingProfile: {
    defaultSessionCount: number;
    pricePerClassCop: number;
    notes: string | null;
    autoGenerateEnabled: boolean;
  } | null;
  primaryParent: { name: string; email: string } | null;
};

type NativeInvoiceRow = {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentNameSnapshot: string;
  recipientName: string;
  recipientEmail: string;
  status: NativeInvoiceStatus;
  issueDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  sessionCount: number;
  pricePerClassCop: number;
  totalCop: number;
  balanceCop: number;
  emailStatus: EmailDeliveryStatus | null;
  emailError: string | null;
  pdfGeneratedAt: string | null;
  paymentProvider: string | null;
  paymentUrl: string | null;
  paymentProviderStatus: string | null;
  paymentProviderLinkId: string | null;
  paymentProviderEnvironment: string | null;
  paymentProviderAmountCop: number | null;
  paymentProviderTransactionId: string | null;
  paymentProviderLastSyncedAt: string | null;
  payments: Array<{
    id: string;
    amountCop: number;
    method: NativeInvoicePaymentMethod;
    paymentDate: string;
    reference: string | null;
    notes: string | null;
    status: NativeInvoicePaymentStatus;
    voidReason: string | null;
    attachments: Array<{ id: string; originalName: string }>;
  }>;
  creditBalance: number;
  creditEntries: Array<{
    id: string;
    type: ClassCreditLedgerEntryType;
    delta: number;
    reason: string | null;
    note: string | null;
    effectiveAt: string;
    invoiceNumber: string | null;
    classStartsAt: string | null;
  }>;
};

type SummaryRow = {
  status: NativeInvoiceStatus;
  count: number;
  totalCop: number;
  balanceCop: number;
};

type WompiSummary = {
  enabled: boolean;
  configured: boolean;
  environment: "sandbox" | "production";
  webhookUrl: string;
  returnUrl: string;
  missing: string[];
};

const copy = {
  en: {
    create: "Create invoice",
    nativeWorkspace: "Native Harmonizing invoices",
    nativeDescription: "Create monthly invoices, send PDFs, and manage status manually until payments are integrated.",
    student: "Student / player",
    sessions: "Sessions",
    start: "Period start",
    end: "Period end",
    issue: "Issue date",
    due: "Due date",
    price: "Price per class (COP)",
    saveProfile: "Save as student default",
    notes: "Notes",
    generate: "Generate draft",
    bulk: "Generate monthly drafts",
    bulkAction: "Generate drafts",
    bulkHint: "Creates drafts only for students with billing profiles. It never emails automatically.",
    invoiceList: "Invoices",
    openSend: "Open and send",
    nextMonth: "Next month",
    pdf: "PDF",
    noInvoices: "No native invoices yet.",
    paymentProvider: "Wompi online payments",
    paymentHint: "Hosted Wompi payment links keep card and bank data outside Harmonizing.",
    wompiEnabled: "Wompi enabled",
    wompiDisabled: "Wompi disabled",
    wompiConfigured: "Configured",
    wompiMissing: "Missing setup",
    wompiSandbox: "Sandbox",
    wompiProduction: "Production",
    webhookUrl: "Webhook URL",
    createWompiLink: "Create Wompi link",
    openWompiLink: "Open payment link",
    payLink: "Payment link",
    providerStatus: "Provider status",
    paid: "Paid",
    balance: "Balance",
    addPayment: "Add payment",
    amount: "Amount",
    method: "Method",
    paymentDate: "Payment date",
    reference: "Reference",
    paymentNotes: "Payment notes",
    history: "Payment history",
    noPayments: "No payments recorded yet.",
    receipt: "Receipt",
    uploadReceipt: "Upload receipt",
    voidPayment: "Void",
    credits: "Class credits",
    creditBalance: "Credit balance",
    addAdjustment: "Add adjustment",
    adjustment: "Adjustment",
    reason: "Reason",
    noCredits: "No credit ledger entries yet.",
    negativeCredits: "Credit balance is negative. Review invoices or add a manual correction.",
    recipient: "Recipient",
    period: "Period",
    profile: "Default billing profile",
    success: "Saved.",
    error: "Something went wrong.",
  },
  es: {
    create: "Crear factura",
    nativeWorkspace: "Facturas nativas Harmonizing",
    nativeDescription: "Crea facturas mensuales, envía PDFs y administra el estado manualmente hasta integrar pagos.",
    student: "Estudiante / player",
    sessions: "Sesiones",
    start: "Inicio del periodo",
    end: "Fin del periodo",
    issue: "Fecha de emisión",
    due: "Fecha de vencimiento",
    price: "Precio por clase (COP)",
    saveProfile: "Guardar como default del estudiante",
    notes: "Notas",
    generate: "Generar borrador",
    bulk: "Generar borradores mensuales",
    bulkAction: "Generar borradores",
    bulkHint: "Crea solo borradores para estudiantes con perfil de facturación. Nunca envía correos automáticamente.",
    invoiceList: "Facturas",
    openSend: "Abrir y enviar",
    nextMonth: "Siguiente mes",
    pdf: "PDF",
    noInvoices: "Aún no hay facturas nativas.",
    paymentProvider: "Pagos en línea con Wompi",
    paymentHint: "Los links de pago hospedados por Wompi mantienen datos de tarjetas y bancos fuera de Harmonizing.",
    wompiEnabled: "Wompi activo",
    wompiDisabled: "Wompi inactivo",
    wompiConfigured: "Configurado",
    wompiMissing: "Falta configuración",
    wompiSandbox: "Sandbox",
    wompiProduction: "Producción",
    webhookUrl: "URL de webhook",
    createWompiLink: "Crear link Wompi",
    openWompiLink: "Abrir link de pago",
    payLink: "Link de pago",
    providerStatus: "Estado proveedor",
    paid: "Pagado",
    balance: "Saldo",
    addPayment: "Agregar pago",
    amount: "Monto",
    method: "Método",
    paymentDate: "Fecha de pago",
    reference: "Referencia",
    paymentNotes: "Notas del pago",
    history: "Historial de pagos",
    noPayments: "Aún no hay pagos registrados.",
    receipt: "Recibo",
    uploadReceipt: "Subir recibo",
    voidPayment: "Anular",
    credits: "Créditos de clase",
    creditBalance: "Balance de créditos",
    addAdjustment: "Agregar ajuste",
    adjustment: "Ajuste",
    reason: "Razón",
    noCredits: "Aún no hay movimientos de créditos.",
    negativeCredits: "El balance de créditos está negativo. Revisa facturas o agrega una corrección manual.",
    recipient: "Destinatario",
    period: "Periodo",
    profile: "Perfil de facturación default",
    success: "Guardado.",
    error: "Algo salió mal.",
  },
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function monthEndInput(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

function statusVariant(status: NativeInvoiceStatus) {
  if (status === NativeInvoiceStatus.PAID) return "success" as const;
  if (status === NativeInvoiceStatus.OPEN) return "warning" as const;
  if (status === NativeInvoiceStatus.VOID) return "danger" as const;
  return "default" as const;
}

function emailVariant(status: EmailDeliveryStatus | null) {
  if (status === EmailDeliveryStatus.SENT) return "success" as const;
  if (status === EmailDeliveryStatus.FAILED) return "danger" as const;
  if (status === EmailDeliveryStatus.SKIPPED) return "warning" as const;
  return "default" as const;
}

const nonSendableStatuses: NativeInvoiceStatus[] = [
  NativeInvoiceStatus.PAID,
  NativeInvoiceStatus.CLOSED,
  NativeInvoiceStatus.VOID,
];

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function NativeInvoiceAdminPanel({
  students,
  invoices,
  summary,
  wompi,
  locale,
}: {
  students: StudentOption[];
  invoices: NativeInvoiceRow[];
  summary: SummaryRow[];
  wompi: WompiSummary | null;
  locale: AppLocale;
}) {
  const router = useRouter();
  const t = copy[locale];
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const first = students[0];
    const start = todayInput();
    return {
      studentId: first?.id ?? "",
      periodStart: start,
      periodEnd: monthEndInput(start),
      issueDate: start,
      dueDate: start,
      sessionCount: String(first?.billingProfile?.defaultSessionCount ?? 4),
      pricePerClassCop: String(first?.billingProfile?.pricePerClassCop ?? DEFAULT_PRICE_PER_CLASS_COP),
      savePriceToStudent: false,
      notes: first?.billingProfile?.notes ?? "",
    };
  });
  const [bulkPeriodStart, setBulkPeriodStart] = useState(todayInput());

  const selectedStudent = useMemo(() => students.find((student) => student.id === form.studentId) ?? null, [students, form.studentId]);
  const total = Number(form.sessionCount || 0) * Number(form.pricePerClassCop || 0);

  function selectStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    setForm((previous) => ({
      ...previous,
      studentId,
      sessionCount: String(student?.billingProfile?.defaultSessionCount ?? 4),
      pricePerClassCop: String(student?.billingProfile?.pricePerClassCop ?? DEFAULT_PRICE_PER_CLASS_COP),
      notes: student?.billingProfile?.notes ?? "",
    }));
  }

  async function postJson(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(typeof payload?.error === "string" ? payload.error : t.error);
    }
    return response.json();
  }

  async function createInvoice() {
    setPending("create");
    setState(null);
    try {
      await postJson("/api/admin/native-invoices", {
        ...form,
        sessionCount: Number(form.sessionCount),
        pricePerClassCop: Number(form.pricePerClassCop),
      });
      setState({ kind: "success", message: t.success });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : t.error });
    } finally {
      setPending(null);
    }
  }

  async function action(url: string, key: string, body?: unknown) {
    setPending(key);
    setState(null);
    try {
      await postJson(url, body);
      setState({ kind: "success", message: t.success });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : t.error });
    } finally {
      setPending(null);
    }
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>, invoiceId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await action(`/api/admin/native-invoices/${invoiceId}/payments`, `payment-${invoiceId}`, {
      amountCop: Number(formData.get("amountCop")),
      method: String(formData.get("method")),
      paymentDate: String(formData.get("paymentDate")),
      reference: String(formData.get("reference") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    event.currentTarget.reset();
  }

  async function submitCreditAdjustment(event: FormEvent<HTMLFormElement>, studentId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await action(`/api/admin/students/${studentId}/class-credits`, `credit-${studentId}`, {
      delta: Number(formData.get("delta")),
      reason: String(formData.get("reason") ?? ""),
      note: String(formData.get("note") ?? ""),
    });
    event.currentTarget.reset();
  }

  async function uploadReceipt(event: FormEvent<HTMLFormElement>, invoiceId: string, paymentId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(`receipt-${paymentId}`);
    setState(null);
    try {
      const response = await fetch(`/api/admin/native-invoices/${invoiceId}/payments/${paymentId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : t.error);
      }
      setState({ kind: "success", message: t.success });
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : t.error });
    } finally {
      setPending(null);
    }
  }

  async function deleteReceipt(invoiceId: string, paymentId: string, attachmentId: string) {
    setPending(`delete-receipt-${attachmentId}`);
    setState(null);
    try {
      const response = await fetch(`/api/admin/native-invoices/${invoiceId}/payments/${paymentId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : t.error);
      }
      setState({ kind: "success", message: t.success });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : t.error });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {summary.map((row) => (
          <Card key={row.status} density="compact" variant="subtle">
            <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            <p className="mt-3 font-display text-2xl text-[var(--color-ink)]">{row.count}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">{formatCop(row.totalCop, locale)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{t.nativeWorkspace}</CardTitle>
            <CardDescription>{t.nativeDescription}</CardDescription>
          </div>
          <Badge variant="gold">COP</Badge>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)] lg:col-span-2">
            {t.student}
            <select value={form.studentId} onChange={(event) => selectStudent(event.target.value)} className="h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm normal-case tracking-normal text-[var(--color-ink)]">
              {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {t.sessions}
            <select value={form.sessionCount} onChange={(event) => setForm((previous) => ({ ...previous, sessionCount: event.target.value }))} className="h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm normal-case tracking-normal text-[var(--color-ink)]">
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {t.price}
            <Input value={form.pricePerClassCop} inputMode="numeric" onChange={(event) => setForm((previous) => ({ ...previous, pricePerClassCop: event.target.value }))} />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {t.start}
            <Input type="date" value={form.periodStart} onChange={(event) => setForm((previous) => ({ ...previous, periodStart: event.target.value, periodEnd: monthEndInput(event.target.value) }))} />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {t.end}
            <Input type="date" value={form.periodEnd} onChange={(event) => setForm((previous) => ({ ...previous, periodEnd: event.target.value }))} />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {t.issue}
            <Input type="date" value={form.issueDate} onChange={(event) => setForm((previous) => ({ ...previous, issueDate: event.target.value }))} />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {t.due}
            <Input type="date" value={form.dueDate} onChange={(event) => setForm((previous) => ({ ...previous, dueDate: event.target.value }))} />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)] lg:col-span-3">
            {t.notes}
            <Textarea value={form.notes} onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))} rows={3} />
          </label>
          <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4">
            <p className="text-xs text-[var(--color-ink-soft)]">{selectedStudent?.primaryParent ? `${t.recipient}: ${selectedStudent.primaryParent.name}` : `${t.recipient}: ${selectedStudent?.name ?? "-"}`}</p>
            <p className="mt-2 font-display text-2xl text-[var(--color-ink)]">{formatCop(total, locale)}</p>
            <label className="mt-3 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
              <input type="checkbox" checked={form.savePriceToStudent} onChange={(event) => setForm((previous) => ({ ...previous, savePriceToStudent: event.target.checked }))} />
              {t.saveProfile}
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="gold" onClick={createInvoice} disabled={pending === "create" || !form.studentId}>{pending === "create" ? "..." : t.generate}</Button>
          {state ? <p className={`text-sm ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
        </div>
      </Card>

      <Card variant="subtle">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t.bulk}</CardTitle>
            <CardDescription>{t.bulkHint}</CardDescription>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto] md:w-auto md:min-w-[24rem]">
            <Input type="date" value={bulkPeriodStart} onChange={(event) => setBulkPeriodStart(event.target.value)} className="min-w-0" />
            <Button variant="outline" onClick={() => action("/api/admin/native-invoices/bulk-generate", "bulk", { periodStart: bulkPeriodStart })} disabled={pending === "bulk"} className="w-full min-w-[10.5rem] whitespace-nowrap sm:w-auto">
              {t.bulkAction}
            </Button>
          </div>
        </div>
      </Card>

      {wompi ? (
        <Card variant="inset">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{t.paymentProvider}</CardTitle>
              <CardDescription>{t.paymentHint}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={wompi.enabled ? "success" : "default"}>{wompi.enabled ? t.wompiEnabled : t.wompiDisabled}</Badge>
              <Badge variant={wompi.configured ? "success" : "warning"}>{wompi.configured ? t.wompiConfigured : t.wompiMissing}</Badge>
              <Badge variant="gold">{wompi.environment === "production" ? t.wompiProduction : t.wompiSandbox}</Badge>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1rem] border border-[var(--color-border)] bg-white/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">{t.webhookUrl}</p>
              <p className="mt-2 break-all text-sm font-semibold text-[var(--color-ink)]">{wompi.webhookUrl || "-"}</p>
            </div>
            <div className="rounded-[1rem] border border-[var(--color-border)] bg-white/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">{wompi.configured ? t.wompiConfigured : t.wompiMissing}</p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{wompi.missing.length ? wompi.missing.join(", ") : "OK"}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>{t.invoiceList}</CardTitle>
        <div className="mt-4 space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-gold)_28%,var(--color-border))] hover:shadow-[var(--shadow-hover)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-ink)]">{invoice.invoiceNumber}</p>
                    <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                    {new Date(invoice.dueDate) < new Date() && invoice.status === NativeInvoiceStatus.OPEN ? <Badge variant="danger">OVERDUE</Badge> : null}
                    {invoice.emailStatus ? <Badge variant={emailVariant(invoice.emailStatus)}>Email {invoice.emailStatus}</Badge> : null}
                    {wompi && invoice.paymentProvider === "WOMPI" ? <Badge variant={invoice.paymentProviderStatus === "APPROVED" ? "success" : "gold"}>Wompi {invoice.paymentProviderStatus ?? ""}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{invoice.studentNameSnapshot} · {t.recipient}: {invoice.recipientName}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{t.period}: {formatDate(invoice.periodStart, locale)} - {formatDate(invoice.periodEnd, locale)} · {invoice.sessionCount} {t.sessions.toLowerCase()}</p>
                  {invoice.emailError ? <p className="mt-1 text-xs text-rose-700">{invoice.emailError}</p> : null}
                </div>
                <div className="text-left lg:text-right">
                  <p className="font-display text-2xl text-[var(--color-ink)]">{formatCop(invoice.totalCop, locale)}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(invoice.issueDate, locale)} · {formatDate(invoice.dueDate, locale)}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {t.paid}: {formatCop(Math.max(invoice.totalCop - invoice.balanceCop, 0), locale)} · {t.balance}: {formatCop(invoice.balanceCop, locale)}
                  </p>
                  {wompi && invoice.paymentProvider === "WOMPI" && invoice.paymentProviderAmountCop ? (
                    <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                      Wompi: {formatCop(invoice.paymentProviderAmountCop, locale)} · {invoice.paymentProviderEnvironment ?? wompi.environment}
                    </p>
                  ) : null}
                </div>
              </div>
              {wompi && invoice.paymentUrl ? (
                <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                  <span className="font-semibold text-[var(--color-ink)]">{t.payLink}: </span>
                  <a href={invoice.paymentUrl} target="_blank" rel="noreferrer" className="break-all font-semibold text-[var(--color-gold-deep)] underline-offset-4 hover:underline">{invoice.paymentUrl}</a>
                  {invoice.paymentProviderTransactionId ? <p className="mt-1">{t.providerStatus}: {invoice.paymentProviderStatus} · {invoice.paymentProviderTransactionId}</p> : null}
                  {invoice.paymentProviderLastSyncedAt ? <p className="mt-1">{new Date(invoice.paymentProviderLastSyncedAt).toLocaleString(intlLocale(locale))}</p> : null}
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_1fr]">
                <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{t.history}</p>
                    <Badge variant={invoice.balanceCop > 0 ? "warning" : "success"}>{t.balance}: {formatCop(invoice.balanceCop, locale)}</Badge>
                  </div>
                  <form onSubmit={(event) => submitPayment(event, invoice.id)} className="mt-3 grid gap-2 md:grid-cols-5">
                    <Input name="amountCop" inputMode="numeric" defaultValue={Math.max(invoice.balanceCop || invoice.totalCop, 0)} aria-label={t.amount} />
                    <select name="method" defaultValue={NativeInvoicePaymentMethod.BANK_TRANSFER} className="h-[2.8rem] rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-xs font-semibold text-[var(--color-ink)]">
                      {Object.values(NativeInvoicePaymentMethod).map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}
                    </select>
                    <Input name="paymentDate" type="date" defaultValue={todayInput()} aria-label={t.paymentDate} />
                    <Input name="reference" placeholder={t.reference} />
                    <Button size="sm" variant="gold" type="submit" disabled={pending === `payment-${invoice.id}` || (invoice.status !== NativeInvoiceStatus.OPEN && invoice.status !== NativeInvoiceStatus.PAID)}>{t.addPayment}</Button>
                    <Textarea name="notes" placeholder={t.paymentNotes} rows={2} className="md:col-span-5" />
                  </form>
                  <div className="mt-3 space-y-2">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="rounded-[1rem] border border-[var(--color-border)] bg-white/68 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink)]">{formatCop(payment.amountCop, locale)} · {payment.method.replaceAll("_", " ")}</p>
                            <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(payment.paymentDate, locale)}{payment.reference ? ` · ${payment.reference}` : ""}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={payment.status === NativeInvoicePaymentStatus.ACTIVE ? "success" : "danger"}>{payment.status}</Badge>
                            {payment.status === NativeInvoicePaymentStatus.ACTIVE ? (
                              <Button size="sm" variant="outline" onClick={() => action(`/api/admin/native-invoices/${invoice.id}/payments/${payment.id}/void`, `void-${payment.id}`, { reason: "" })} disabled={pending === `void-${payment.id}`}>{t.voidPayment}</Button>
                            ) : null}
                          </div>
                        </div>
                        {payment.notes ? <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{payment.notes}</p> : null}
                        {payment.voidReason ? <p className="mt-2 text-xs text-rose-700">{payment.voidReason}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {payment.attachments.map((attachment) => (
                            <span key={attachment.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1">
                              <Link href={`/api/invoices/native/payments/attachments/${attachment.id}`} target="_blank" className="text-xs font-semibold text-[var(--color-gold-deep)] underline-offset-4 hover:underline">
                                {attachment.originalName}
                              </Link>
                              <button
                                type="button"
                                onClick={() => deleteReceipt(invoice.id, payment.id, attachment.id)}
                                disabled={pending === `delete-receipt-${attachment.id}`}
                                className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                        <form onSubmit={(event) => uploadReceipt(event, invoice.id, payment.id)} className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <Input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
                          <Button size="sm" variant="outline" type="submit" disabled={pending === `receipt-${payment.id}`} className="whitespace-nowrap">{t.uploadReceipt}</Button>
                        </form>
                      </div>
                    ))}
                    {!invoice.payments.length ? <p className="rounded-[0.95rem] border border-dashed border-[var(--color-border)] px-3 py-4 text-xs text-[var(--color-ink-soft)]">{t.noPayments}</p> : null}
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{t.credits}</p>
                    <Badge variant={invoice.creditBalance < 0 ? "danger" : "gold"}>{t.creditBalance}: {invoice.creditBalance}</Badge>
                  </div>
                  {invoice.creditBalance < 0 ? <p className="mt-2 text-xs text-rose-700">{t.negativeCredits}</p> : null}
                  <form onSubmit={(event) => submitCreditAdjustment(event, invoice.studentId)} className="mt-3 grid gap-2 md:grid-cols-[7rem_1fr_auto]">
                    <Input name="delta" type="number" defaultValue="1" aria-label={t.adjustment} />
                    <Input name="reason" placeholder={t.reason} required />
                    <Button size="sm" variant="outline" type="submit" disabled={pending === `credit-${invoice.studentId}`}>{t.addAdjustment}</Button>
                    <Textarea name="note" placeholder={t.notes} rows={2} className="md:col-span-3" />
                  </form>
                  <div className="mt-3 space-y-2">
                    {invoice.creditEntries.map((entry) => (
                      <div key={entry.id} className="rounded-[0.95rem] border border-[var(--color-border)] bg-white/68 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--color-ink)]">{entry.delta > 0 ? "+" : ""}{entry.delta} · {entry.type.replaceAll("_", " ")}</span>
                          <span>{formatDate(entry.effectiveAt, locale)}</span>
                        </div>
                        <p className="mt-1">{entry.reason ?? entry.invoiceNumber ?? entry.classStartsAt ?? "-"}</p>
                      </div>
                    ))}
                    {!invoice.creditEntries.length ? <p className="rounded-[0.95rem] border border-dashed border-[var(--color-border)] px-3 py-4 text-xs text-[var(--color-ink-soft)]">{t.noCredits}</p> : null}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="gold" onClick={() => action(`/api/admin/native-invoices/${invoice.id}/open-send`, `send-${invoice.id}`)} disabled={pending === `send-${invoice.id}` || nonSendableStatuses.includes(invoice.status)}>{t.openSend}</Button>
                  {wompi ? (
                    <Button size="sm" variant="outline" onClick={() => action(`/api/admin/native-invoices/${invoice.id}/wompi-link`, `wompi-${invoice.id}`)} disabled={pending === `wompi-${invoice.id}` || !wompi.configured || invoice.status !== NativeInvoiceStatus.OPEN || invoice.balanceCop <= 0}>
                      {t.createWompiLink}
                    </Button>
                  ) : null}
                  {wompi && invoice.paymentUrl ? <a href={invoice.paymentUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">{t.openWompiLink}</Button></a> : null}
                  <Link href={`/api/invoices/native/${invoice.id}/pdf`} target="_blank"><Button size="sm" variant="outline">{t.pdf}</Button></Link>
                  <Button size="sm" variant="outline" onClick={() => action(`/api/admin/native-invoices/${invoice.id}/next-month`, `next-${invoice.id}`)} disabled={pending === `next-${invoice.id}`}>{t.nextMonth}</Button>
                </div>
                <select value={invoice.status} onChange={(event) => action(`/api/admin/native-invoices/${invoice.id}/status`, `status-${invoice.id}`, { status: event.target.value })} className="h-9 rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-xs font-semibold text-[var(--color-ink)]">
                  {Object.values(NativeInvoiceStatus).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          ))}
          {!invoices.length ? <p className="rounded-[1.1rem] border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-ink-soft)]">{t.noInvoices}</p> : null}
        </div>
      </Card>

    </div>
  );
}
