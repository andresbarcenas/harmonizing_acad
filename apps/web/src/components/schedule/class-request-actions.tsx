"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";

type ClassRequestDecision = "ACCEPTED" | "REJECTED";

export function ClassRequestActions({ requestId, locale = "en" }: { requestId: string; locale?: AppLocale }) {
  const router = useRouter();
  const [pending, setPending] = useState<ClassRequestDecision | null>(null);
  const [response, setResponse] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const isSpanish = locale === "es";

  async function decide(status: ClassRequestDecision) {
    setPending(status);
    setState(null);
    const apiResponse = await fetch(`/api/classes/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        reviewerResponse: response.trim() || undefined,
        rejectionReason: status === "REJECTED" ? rejectionReason.trim() || undefined : undefined,
        internalNote: internalNote.trim() || undefined,
      }),
    });
    const payload = (await apiResponse.json().catch(() => null)) as { error?: string } | null;
    if (!apiResponse.ok) {
      setState({ kind: "error", message: payload?.error ?? (isSpanish ? "No se pudo procesar la solicitud." : "Could not process the request.") });
      setPending(null);
      return;
    }
    setState({ kind: "success", message: status === "ACCEPTED" ? (isSpanish ? "Solicitud aprobada." : "Request approved.") : (isSpanish ? "Solicitud rechazada." : "Request rejected.") });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={2} placeholder={isSpanish ? "Respuesta visible si apruebas la solicitud" : "Visible response if you approve the request"} />
      <Textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={2} placeholder={isSpanish ? "Motivo visible si rechazas la solicitud" : "Visible reason if you reject the request"} />
      <Textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={2} placeholder={isSpanish ? "Nota interna opcional" : "Optional internal note"} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="sm" variant="gold" onClick={() => decide("ACCEPTED")} disabled={pending !== null} className="w-full sm:w-auto">
          {pending === "ACCEPTED" ? (isSpanish ? "Aprobando..." : "Approving...") : isSpanish ? "Aprobar y agendar" : "Approve and book"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => decide("REJECTED")} disabled={pending !== null} className="w-full sm:w-auto">
          {pending === "REJECTED" ? (isSpanish ? "Rechazando..." : "Rejecting...") : isSpanish ? "Rechazar" : "Reject"}
        </Button>
      </div>
      {state ? <p className={`text-xs ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </div>
  );
}
