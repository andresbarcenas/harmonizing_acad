import Link from "next/link";
import type { ReactNode } from "react";
import { EmailDeliveryStatus, EmailDeliveryType, Prisma, Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatDateTimeInZone } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";

const statuses = Object.values(EmailDeliveryStatus);
const types = Object.values(EmailDeliveryType);

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AdminEmailsPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.ADMIN]);
  const params = await searchParams;
  const isSpanish = viewer.locale === "es";
  const selectedStatus = statuses.includes(params?.status as EmailDeliveryStatus) ? params?.status as EmailDeliveryStatus : undefined;
  const selectedType = types.includes(params?.type as EmailDeliveryType) ? params?.type as EmailDeliveryType : undefined;
  const query = params?.q?.trim() ?? "";
  const fromDate = parseDate(params?.from, "start");
  const toDate = parseDate(params?.to, "end");

  const where: Prisma.EmailDeliveryLogWhereInput = {
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(selectedType ? { type: selectedType } : {}),
    ...(query ? {
      OR: [
        { recipientEmail: { contains: query, mode: "insensitive" } },
        { subject: { contains: query, mode: "insensitive" } },
        { providerMessageId: { contains: query, mode: "insensitive" } },
        { recipient: { name: { contains: query, mode: "insensitive" } } },
      ],
    } : {}),
    ...((fromDate || toDate) ? {
      attemptedAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      },
    } : {}),
  };

  const [logs, totalCount, sentCount, failedCount, skippedCount] = await Promise.all([
    db.emailDeliveryLog.findMany({
      where,
      include: { recipient: { select: { name: true, email: true } } },
      orderBy: { attemptedAt: "desc" },
      take: 100,
    }),
    db.emailDeliveryLog.count({ where }),
    db.emailDeliveryLog.count({ where: { ...where, status: EmailDeliveryStatus.SENT } }),
    db.emailDeliveryLog.count({ where: { ...where, status: EmailDeliveryStatus.FAILED } }),
    db.emailDeliveryLog.count({ where: { ...where, status: EmailDeliveryStatus.SKIPPED } }),
  ]);

  return (
    <AppShell role={viewer.role} activePath="/admin/emails" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Operación de correos" : "Email operations"}
        title={isSpanish ? "Registro de envíos de email." : "Email sending log."}
        description={isSpanish
          ? "Audita enlaces mágicos, bienvenidas, consentimientos y recordatorios enviados por Resend."
          : "Audit magic links, welcome emails, consent receipts, and class reminders sent through Resend."}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={isSpanish ? "Resultados" : "Results"} value={totalCount} />
        <SummaryCard label={isSpanish ? "Enviados" : "Sent"} value={sentCount} tone="success" />
        <SummaryCard label={isSpanish ? "Fallidos" : "Failed"} value={failedCount} tone="danger" />
        <SummaryCard label={isSpanish ? "Omitidos" : "Skipped"} value={skippedCount} tone="warning" />
      </div>

      <Card>
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_1fr_1fr_auto_auto] lg:items-end">
          <Field label={isSpanish ? "Estado" : "Status"}>
            <select name="status" defaultValue={selectedStatus ?? ""} className={selectClassName}>
              <option value="">{isSpanish ? "Todos" : "All"}</option>
              {statuses.map((status) => <option key={status} value={status}>{statusLabel(status, viewer.locale)}</option>)}
            </select>
          </Field>
          <Field label={isSpanish ? "Tipo" : "Type"}>
            <select name="type" defaultValue={selectedType ?? ""} className={selectClassName}>
              <option value="">{isSpanish ? "Todos" : "All"}</option>
              {types.map((type) => <option key={type} value={type}>{typeLabel(type, viewer.locale)}</option>)}
            </select>
          </Field>
          <Field label={isSpanish ? "Buscar" : "Search"}>
            <Input name="q" defaultValue={query} placeholder={isSpanish ? "Email, asunto o id" : "Email, subject, or id"} />
          </Field>
          <Field label={isSpanish ? "Desde" : "From"}>
            <Input name="from" type="date" defaultValue={params?.from ?? ""} />
          </Field>
          <Field label={isSpanish ? "Hasta" : "To"}>
            <Input name="to" type="date" defaultValue={params?.to ?? ""} />
          </Field>
          <Button type="submit" variant="gold">{isSpanish ? "Filtrar" : "Filter"}</Button>
          <Link href="/admin/emails"><Button type="button" variant="outline">{isSpanish ? "Limpiar" : "Clear"}</Button></Link>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{isSpanish ? "Últimos intentos" : "Latest attempts"}</CardTitle>
            <CardDescription>{isSpanish ? "Mostrando hasta 100 registros recientes." : "Showing up to 100 recent records."}</CardDescription>
          </div>
          <Badge>{isSpanish ? "Resend" : "Resend"}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-[1.35rem] border border-[var(--color-border)] bg-white/74 p-4 xl:grid-cols-[0.8fr_0.9fr_1.25fr_1.6fr_0.7fr_1fr] xl:items-start">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">{isSpanish ? "Estado" : "Status"}</p>
                <Badge variant={statusVariant(log.status)} className="mt-1">{statusLabel(log.status, viewer.locale)}</Badge>
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">{isSpanish ? "Tipo" : "Type"}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{typeLabel(log.type, viewer.locale)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">{isSpanish ? "Destinatario" : "Recipient"}</p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--color-ink)]">{log.recipient?.name ?? log.recipientEmail ?? (isSpanish ? "Sin email" : "No email")}</p>
                <p className="truncate text-xs text-[var(--color-ink-soft)]">{log.recipientEmail ?? log.recipient?.email ?? "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">{isSpanish ? "Asunto" : "Subject"}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{log.subject}</p>
                {log.errorMessage ? <p className="mt-1 text-xs text-rose-700">{log.errorMessage}</p> : null}
                {log.providerMessageId ? <p className="mt-1 truncate text-xs text-[var(--color-ink-soft)]">ID: {log.providerMessageId}</p> : null}
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">Provider</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{log.provider}</p>
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">{isSpanish ? "Hora" : "Time"}</p>
                <p className="mt-1 text-sm text-[var(--color-ink)]">{formatDateTimeInZone(log.attemptedAt, viewer.timezone, viewer.locale)}</p>
              </div>
            </div>
          ))}
          {!logs.length ? <CardDescription>{isSpanish ? "No hay envíos para este filtro." : "No email attempts match this filter."}</CardDescription> : null}
        </div>
      </Card>
    </AppShell>
  );
}

function parseDate(value: string | undefined, boundary: "start" | "end") {
  if (!value) return undefined;
  const date = new Date(boundary === "start" ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "danger" | "warning" }) {
  const color = tone === "success" ? "text-[var(--color-success)]" : tone === "danger" ? "text-[var(--color-danger)]" : tone === "warning" ? "text-[var(--color-warning)]" : "text-[var(--color-ink)]";
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p>
      <p className={`mt-2 font-display text-4xl tracking-[-0.05em] ${color}`}>{value}</p>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function statusLabel(status: EmailDeliveryStatus, locale: AppLocale) {
  const labels = {
    en: { PENDING: "Pending", SENT: "Sent", FAILED: "Failed", SKIPPED: "Skipped" },
    es: { PENDING: "Pendiente", SENT: "Enviado", FAILED: "Fallido", SKIPPED: "Omitido" },
  } as const;
  return labels[locale][status];
}

function typeLabel(type: EmailDeliveryType, locale: AppLocale) {
  const labels = {
    en: { MAGIC_LINK: "Magic link", WELCOME: "Welcome", CONSENT_COPY: "Consent copy", CLASS_REMINDER: "Class reminder" },
    es: { MAGIC_LINK: "Enlace mágico", WELCOME: "Bienvenida", CONSENT_COPY: "Copia consentimiento", CLASS_REMINDER: "Recordatorio clase" },
  } as const;
  return labels[locale][type];
}

function statusVariant(status: EmailDeliveryStatus) {
  if (status === EmailDeliveryStatus.SENT) return "success";
  if (status === EmailDeliveryStatus.FAILED) return "danger";
  if (status === EmailDeliveryStatus.SKIPPED) return "warning";
  return "default";
}

const selectClassName = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";
