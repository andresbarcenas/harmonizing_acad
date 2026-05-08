"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

export function StudentInvoiceSyncButton({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function syncNow() {
    setPending(true);
    setState(null);

    const response = await fetch("/api/invoices", {
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? (locale === "es" ? "No se pudo sincronizar." : "Could not sync.") });
      setPending(false);
      return;
    }

    setState({ kind: "success", message: locale === "es" ? "Sincronización completada." : "Sync completed." });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={syncNow} disabled={pending} className="w-full sm:w-auto">
        {pending ? (locale === "es" ? "Sincronizando..." : "Syncing...") : locale === "es" ? "Sincronizar facturas" : "Sync invoices"}
      </Button>
      {state ? (
        <p className={`text-xs ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}
