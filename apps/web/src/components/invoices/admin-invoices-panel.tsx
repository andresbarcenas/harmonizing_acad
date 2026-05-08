"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InvoiceContactLinkStrategy, InvoiceSyncStatus } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";

type AdminInvoiceRow = {
  studentId: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  teacherName: string;
  invoiceCount: number;
  lastSyncedAt: string | null;
  isStale: boolean;
  link: {
    alegraContactId: string | null;
    strategy: InvoiceContactLinkStrategy;
    lastError: string | null;
  } | null;
  latestRun: {
    status: InvoiceSyncStatus;
    startedAt: string;
    errorSummary: string | null;
  } | null;
};

function badgeVariantForStatus(status: InvoiceSyncStatus | null | undefined) {
  if (status === InvoiceSyncStatus.SUCCESS) return "success" as const;
  if (status === InvoiceSyncStatus.PARTIAL || status === InvoiceSyncStatus.RUNNING) return "warning" as const;
  if (status === InvoiceSyncStatus.FAILED) return "danger" as const;
  return "default" as const;
}

export function AdminInvoicesPanel({
  rows,
  latestAllRun,
  isDemoMode,
  locale = "en",
}: {
  rows: AdminInvoiceRow[];
  latestAllRun: {
    status: InvoiceSyncStatus;
    startedAt: string;
    finishedAt: string | null;
    studentsProcessed: number;
    studentsFailed: number;
    invoicesUpserted: number;
    errorSummary: string | null;
  } | null;
  isDemoMode?: boolean;
  locale?: AppLocale;
}) {
  const router = useRouter();
  const [pendingGlobal, setPendingGlobal] = useState(false);
  const [pendingByStudent, setPendingByStudent] = useState<Record<string, boolean>>({});
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.link?.alegraContactId ?? ""])),
  );
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const staleCount = useMemo(() => rows.filter((row) => row.isStale).length, [rows]);

  async function syncAll() {
    setPendingGlobal(true);
    setState(null);

    const response = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? (locale === "es" ? "No se pudo sincronizar." : "Could not sync.") });
      setPendingGlobal(false);
      return;
    }

    setState({ kind: "success", message: locale === "es" ? "Sincronización global finalizada." : "Global sync completed." });
    setPendingGlobal(false);
    router.refresh();
  }

  async function syncStudent(studentId: string) {
    setPendingByStudent((previous) => ({ ...previous, [studentId]: true }));
    setState(null);

    const response = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? (locale === "es" ? "No se pudo sincronizar el estudiante." : "Could not sync the student.") });
      setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
      return;
    }

    setState({ kind: "success", message: locale === "es" ? "Sincronización individual completada." : "Student sync completed." });
    setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
    router.refresh();
  }

  async function saveManualLink(studentId: string) {
    setPendingByStudent((previous) => ({ ...previous, [studentId]: true }));
    setState(null);

    const alegraContactId = linkInputs[studentId]?.trim() || null;

    const response = await fetch("/api/admin/invoices/contact-link", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, alegraContactId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? (locale === "es" ? "No se pudo actualizar el enlace de contacto." : "Could not update the contact link.") });
      setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
      return;
    }

    setState({ kind: "success", message: locale === "es" ? "Enlace de contacto actualizado." : "Contact link updated." });
    setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">{locale === "es" ? "Panel de sincronización Alegra" : "Alegra sync panel"}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">
              {locale === "es" ? "Estudiantes con cache vencido" : "Students with stale cache"}: {staleCount} / {rows.length}
            </p>
            {isDemoMode ? (
              <p className="mt-1 text-xs text-amber-700">
                {locale === "es" ? "Modo demo: sincronizar utiliza cache local hasta configurar credenciales de Alegra." : "Demo mode: sync uses local cache until Alegra credentials are configured."}
              </p>
            ) : null}
          </div>
          <Button variant="gold" size="sm" onClick={syncAll} disabled={pendingGlobal} className="w-full sm:w-auto">
            {pendingGlobal ? (locale === "es" ? "Sincronizando..." : "Syncing...") : locale === "es" ? "Sincronizar todos" : "Sync all"}
          </Button>
        </div>
        {latestAllRun ? (
          <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-white/72 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
            <p>
              {locale === "es" ? "Última corrida global" : "Latest global run"}: {new Date(latestAllRun.startedAt).toLocaleString(intlLocale(locale))} · {locale === "es" ? "Procesados" : "Processed"}: {latestAllRun.studentsProcessed} · {locale === "es" ? "Fallidos" : "Failed"}: {latestAllRun.studentsFailed}
            </p>
            <p>
              {locale === "es" ? "Facturas actualizadas" : "Updated invoices"}: {latestAllRun.invoicesUpserted} · {locale === "es" ? "Estado" : "Status"}: {latestAllRun.status}
            </p>
          </div>
        ) : null}
      </Card>

      {state ? (
        <p className={`text-sm ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}

      {rows.map((row) => (
        <Card key={row.studentId}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                src={row.image ?? undefined}
                alt={row.name}
                fallback={row.name.slice(0, 1).toUpperCase()}
                className="h-10 w-10 text-xs"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="truncate text-xs text-[var(--color-ink-soft)]">{row.email}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{locale === "es" ? "Docente" : "Teacher"}: {row.teacherName}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={row.isStale ? "warning" : "success"}>{row.isStale ? "Stale" : locale === "es" ? "Actualizada" : "Updated"}</Badge>
              <Badge variant="default">{row.invoiceCount} {locale === "es" ? "factura(s)" : "invoice(s)"}</Badge>
              <Badge variant={badgeVariantForStatus(row.latestRun?.status)}>{row.latestRun?.status ?? "SIN CORRIDA"}</Badge>
            </div>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-[1.3fr_auto_auto]">
            <Input
              value={linkInputs[row.studentId] ?? ""}
              onChange={(event) =>
                setLinkInputs((previous) => ({
                  ...previous,
                  [row.studentId]: event.target.value,
                }))
              }
              placeholder="Alegra contact ID (manual)"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveManualLink(row.studentId)}
              disabled={pendingByStudent[row.studentId]}
              className="w-full lg:w-auto"
            >
              {locale === "es" ? "Guardar enlace" : "Save link"}
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => syncStudent(row.studentId)}
              disabled={pendingByStudent[row.studentId]}
              className="w-full lg:w-auto"
            >
              {pendingByStudent[row.studentId] ? "Sync..." : locale === "es" ? "Sync estudiante" : "Sync student"}
            </Button>
          </div>

          <div className="mt-3 text-xs text-[var(--color-ink-soft)]">
            <p>
              {locale === "es" ? "Última sincronización cache" : "Last cache sync"}: {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString(intlLocale(locale)) : locale === "es" ? "Nunca" : "Never"}
            </p>
            <p>
              {locale === "es" ? "Enlace actual" : "Current link"}: {row.link?.alegraContactId ?? (locale === "es" ? "Sin contacto" : "No contact")} · {locale === "es" ? "estrategia" : "strategy"}: {row.link?.strategy ?? "EMAIL_AUTO"}
            </p>
            {row.link?.lastError ? <p className="text-rose-700">Error: {row.link.lastError}</p> : null}
            {row.latestRun?.errorSummary ? <p className="text-rose-700">Corrida: {row.latestRun.errorSummary}</p> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
