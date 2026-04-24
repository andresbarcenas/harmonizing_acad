"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TeacherSessionActions({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes?: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function markSession(nextStatus: "COMPLETED" | "NO_SHOW") {
    setStatus(null);

    const response = await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        status: nextStatus,
        notes: notes.trim().length ? notes.trim() : undefined,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: payload?.error ?? "No se pudo actualizar la clase." });
      return;
    }

    setStatus({ kind: "success", message: "Clase actualizada y notificada." });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        placeholder="Notas de clase (opcional)"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button size="sm" variant="gold" onClick={() => markSession("COMPLETED")} disabled={isPending} className="w-full sm:w-auto">
          Marcar completada
        </Button>
        <Button size="sm" variant="outline" onClick={() => markSession("NO_SHOW")} disabled={isPending} className="w-full sm:w-auto">
          Marcar no asistida
        </Button>
      </div>
      {status ? (
        <p className={`text-xs ${status.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>
      ) : null}
    </div>
  );
}
