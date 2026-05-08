"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

export function SeriesActions({ seriesId, isActive, locale = "en" }: { seriesId: string; isActive: boolean; locale?: AppLocale }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"stop" | "delete" | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function stopSeries() {
    if (!window.confirm(locale === "es" ? "¿Detener las próximas clases de esta serie?" : "Stop upcoming classes in this series?")) return;
    setPendingAction("stop");
    setStatus(null);
    const response = await fetch(`/api/sessions/recurrence/${seriesId}`, {
      method: "PATCH",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: data?.error ?? (locale === "es" ? "No se pudo detener la serie." : "Could not stop the series.") });
      setPendingAction(null);
      return;
    }

    setStatus({ kind: "success", message: locale === "es" ? "Serie detenida. Se cancelaron próximas clases." : "Series stopped. Upcoming classes were cancelled." });
    setPendingAction(null);
    router.refresh();
  }

  async function deleteSeries() {
    if (!window.confirm(locale === "es" ? "¿Eliminar esta serie? Se conservarán clases completadas/no-show." : "Delete this series? Completed/no-show classes will be preserved.")) return;
    setPendingAction("delete");
    setStatus(null);
    const response = await fetch(`/api/sessions/recurrence/${seriesId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: data?.error ?? (locale === "es" ? "No se pudo eliminar la serie." : "Could not delete the series.") });
      setPendingAction(null);
      return;
    }

    setStatus({ kind: "success", message: locale === "es" ? "Serie eliminada (se conservaron clases completadas)." : "Series deleted. Completed classes were preserved." });
    setPendingAction(null);
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={stopSeries}
          disabled={!isActive || pendingAction !== null}
        >
          {pendingAction === "stop" ? (locale === "es" ? "Deteniendo..." : "Stopping...") : locale === "es" ? "Detener futuras" : "Stop future"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={deleteSeries}
          disabled={pendingAction !== null}
        >
          {pendingAction === "delete" ? (locale === "es" ? "Eliminando..." : "Deleting...") : locale === "es" ? "Eliminar serie" : "Delete series"}
        </Button>
      </div>
      {status ? (
        <p className={`text-xs ${status.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>
      ) : null}
    </div>
  );
}
