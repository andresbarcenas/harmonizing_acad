"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

type HistoricalImportRowActionsProps = {
  batchId: string;
  rowId: string;
  disabled?: boolean;
  locale: AppLocale;
};

export function HistoricalImportRowActions({ batchId, rowId, disabled, locale }: HistoricalImportRowActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSpanish = locale === "es";

  async function runAction(action: "APPLY" | "SKIP" | "SOURCE_ONLY") {
    setPendingAction(action);
    setError(null);

    const response = await fetch(`/api/admin/historical-imports/${batchId}/rows/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? (isSpanish ? "No se pudo actualizar la fila." : "Could not update row."));
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="gold" disabled={disabled || pendingAction !== null} onClick={() => runAction("APPLY")}>
          {pendingAction === "APPLY" ? (isSpanish ? "Aplicando..." : "Applying...") : isSpanish ? "Aplicar" : "Apply"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled || pendingAction !== null} onClick={() => runAction("SOURCE_ONLY")}>
          {isSpanish ? "Solo fuente" : "Source only"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled || pendingAction !== null} onClick={() => runAction("SKIP")}>
          {isSpanish ? "Omitir" : "Skip"}
        </Button>
      </div>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
