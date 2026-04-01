"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function RescheduleWidget({
  sessionId,
  slots,
  timezone,
}: {
  sessionId: string;
  slots: { startUtc: string; endUtc: string }[];
  timezone: string;
}) {
  const [selected, setSelected] = useState<string | null>(slots[0]?.startUtc ?? null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<string>("");

  const mapped = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        label: new Date(slot.startUtc).toLocaleString("es-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: timezone,
        }),
      })),
    [slots, timezone],
  );

  async function submit() {
    if (!selected) return;
    setPending(true);
    setState("");

    const chosen = mapped.find((slot) => slot.startUtc === selected);
    if (!chosen) return;

    const response = await fetch("/api/reschedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        proposedStartUtc: chosen.startUtc,
        proposedEndUtc: chosen.endUtc,
        studentMessage: "Solicitud rápida desde calendario semanal",
      }),
    });

    if (!response.ok) {
      setState("No se pudo enviar la solicitud");
      setPending(false);
      return;
    }

    setState("Solicitud enviada. Estado: pendiente de aprobación");
    setPending(false);
  }

  if (!slots.length) {
    return (
      <Card>
        <CardTitle>No hay espacios disponibles esta semana</CardTitle>
        <CardDescription>Tu profesora agregará más horarios pronto.</CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Reagendar en 2 clics</CardTitle>
      <CardDescription>1) Elige horario 2) Envía solicitud</CardDescription>
      <div className="mt-4 grid gap-2">
        {mapped.map((slot) => (
          <button
            key={slot.startUtc}
            type="button"
            onClick={() => setSelected(slot.startUtc)}
            className={`rounded-xl border px-3 py-2 text-left text-sm ${
              selected === slot.startUtc ? "border-[var(--color-gold)] bg-[var(--color-paper-strong)]" : "border-[var(--color-border)]"
            }`}
          >
            {slot.label}
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full" variant="gold" onClick={submit} disabled={pending}>
        {pending ? "Enviando..." : "Proponer nuevo horario"}
      </Button>
      {state ? <p className="mt-3 text-sm text-[var(--color-ink-soft)]">{state}</p> : null}
    </Card>
  );
}
