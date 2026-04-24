"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InvoiceContactLinkStrategy, InvoiceSyncStatus } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
      setState({ kind: "error", message: payload?.error ?? "No se pudo sincronizar." });
      setPendingGlobal(false);
      return;
    }

    setState({ kind: "success", message: "Sincronización global finalizada." });
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
      setState({ kind: "error", message: payload?.error ?? "No se pudo sincronizar el estudiante." });
      setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
      return;
    }

    setState({ kind: "success", message: "Sincronización individual completada." });
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
      setState({ kind: "error", message: payload?.error ?? "No se pudo actualizar el enlace de contacto." });
      setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
      return;
    }

    setState({ kind: "success", message: "Enlace de contacto actualizado." });
    setPendingByStudent((previous) => ({ ...previous, [studentId]: false }));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">Panel de sincronización Alegra</p>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Estudiantes con cache vencido: {staleCount} / {rows.length}
            </p>
            {isDemoMode ? (
              <p className="mt-1 text-xs text-amber-700">
                Modo demo: sincronizar utiliza cache local hasta configurar credenciales de Alegra.
              </p>
            ) : null}
          </div>
          <Button variant="gold" size="sm" onClick={syncAll} disabled={pendingGlobal} className="w-full sm:w-auto">
            {pendingGlobal ? "Sincronizando..." : "Sincronizar todos"}
          </Button>
        </div>
        {latestAllRun ? (
          <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-white/72 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
            <p>
              Última corrida global: {new Date(latestAllRun.startedAt).toLocaleString("es-US")} · Procesados: {latestAllRun.studentsProcessed} · Fallidos: {latestAllRun.studentsFailed}
            </p>
            <p>
              Facturas actualizadas: {latestAllRun.invoicesUpserted} · Estado: {latestAllRun.status}
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
                <p className="text-xs text-[var(--color-ink-soft)]">Docente: {row.teacherName}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={row.isStale ? "warning" : "success"}>{row.isStale ? "Stale" : "Actualizada"}</Badge>
              <Badge variant="default">{row.invoiceCount} factura(s)</Badge>
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
              Guardar enlace
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => syncStudent(row.studentId)}
              disabled={pendingByStudent[row.studentId]}
              className="w-full lg:w-auto"
            >
              {pendingByStudent[row.studentId] ? "Sync..." : "Sync estudiante"}
            </Button>
          </div>

          <div className="mt-3 text-xs text-[var(--color-ink-soft)]">
            <p>
              Última sincronización cache: {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString("es-US") : "Nunca"}
            </p>
            <p>
              Enlace actual: {row.link?.alegraContactId ?? "Sin contacto"} · estrategia: {row.link?.strategy ?? "EMAIL_AUTO"}
            </p>
            {row.link?.lastError ? <p className="text-rose-700">Error: {row.link.lastError}</p> : null}
            {row.latestRun?.errorSummary ? <p className="text-rose-700">Corrida: {row.latestRun.errorSummary}</p> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
