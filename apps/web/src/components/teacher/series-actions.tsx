"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SeriesActions({ seriesId, isActive }: { seriesId: string; isActive: boolean }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"stop" | "delete" | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function stopSeries() {
    if (!window.confirm("¿Detener las próximas clases de esta serie?")) return;
    setPendingAction("stop");
    setStatus(null);
    const response = await fetch(`/api/sessions/recurrence/${seriesId}`, {
      method: "PATCH",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: data?.error ?? "No se pudo detener la serie." });
      setPendingAction(null);
      return;
    }

    setStatus({ kind: "success", message: "Serie detenida. Se cancelaron próximas clases." });
    setPendingAction(null);
    router.refresh();
  }

  async function deleteSeries() {
    if (!window.confirm("¿Eliminar esta serie? Se conservarán clases completadas/no-show.")) return;
    setPendingAction("delete");
    setStatus(null);
    const response = await fetch(`/api/sessions/recurrence/${seriesId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: data?.error ?? "No se pudo eliminar la serie." });
      setPendingAction(null);
      return;
    }

    setStatus({ kind: "success", message: "Serie eliminada (se conservaron clases completadas)." });
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
          {pendingAction === "stop" ? "Deteniendo..." : "Detener futuras"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={deleteSeries}
          disabled={pendingAction !== null}
        >
          {pendingAction === "delete" ? "Eliminando..." : "Eliminar serie"}
        </Button>
      </div>
      {status ? (
        <p className={`text-xs ${status.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>
      ) : null}
    </div>
  );
}
