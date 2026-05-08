"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RescheduleStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

export function RequestActions({ requestId, locale = "en" }: { requestId: string; locale?: AppLocale }) {
  const router = useRouter();
  const [pending, setPending] = useState<RescheduleStatus | null>(null);
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function decide(status: RescheduleStatus) {
    setPending(status);
    setState(null);

    const response = await fetch("/api/reschedules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        status,
        teacherResponse: status === RescheduleStatus.REJECTED ? (locale === "es" ? "Horario no disponible" : "Time not available") : undefined,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? (locale === "es" ? "No se pudo procesar la solicitud." : "Could not process the request.") });
      setPending(null);
      return;
    }

    setState({
      kind: "success",
      message: status === RescheduleStatus.ACCEPTED
        ? locale === "es" ? "Solicitud aprobada." : "Request approved."
        : locale === "es" ? "Solicitud rechazada." : "Request rejected.",
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          variant="gold"
          onClick={() => decide(RescheduleStatus.ACCEPTED)}
          disabled={pending !== null}
          className="w-full sm:w-auto"
        >
          {pending === RescheduleStatus.ACCEPTED ? (locale === "es" ? "Aprobando..." : "Approving...") : locale === "es" ? "Aceptar" : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => decide(RescheduleStatus.REJECTED)}
          disabled={pending !== null}
          className="w-full sm:w-auto"
        >
          {pending === RescheduleStatus.REJECTED ? (locale === "es" ? "Rechazando..." : "Rejecting...") : locale === "es" ? "Rechazar" : "Reject"}
        </Button>
      </div>
      {state ? (
        <p className={`text-xs ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}
