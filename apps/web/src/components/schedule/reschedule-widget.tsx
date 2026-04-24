"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buildWeekInTimezone, dayKeyInTimezone, labelDay, labelTime } from "@/components/schedule/calendar-utils";

type RescheduleSlot = {
  startUtc: string;
  endUtc: string;
};

export function RescheduleWidget({
  sessionId,
  slots,
  timezone,
}: {
  sessionId: string;
  slots: RescheduleSlot[];
  timezone: string;
}) {
  const router = useRouter();
  const [selectedStartUtc, setSelectedStartUtc] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const mapped = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        startDate: new Date(slot.startUtc),
        endDate: new Date(slot.endUtc),
      })),
    [slots],
  );

  const week = useMemo(() => buildWeekInTimezone(timezone), [timezone]);
  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, typeof mapped>();
    for (const slot of mapped) {
      const key = dayKeyInTimezone(slot.startDate, timezone);
      const current = grouped.get(key) ?? [];
      current.push(slot);
      grouped.set(key, current.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()));
    }
    return grouped;
  }, [mapped, timezone]);

  const dayKeys = useMemo(() => week.map((date) => dayKeyInTimezone(date, timezone)), [week, timezone]);
  const firstDayWithSlots = useMemo(() => dayKeys.find((key) => (slotsByDay.get(key)?.length ?? 0) > 0) ?? dayKeys[0], [dayKeys, slotsByDay]);
  const [selectedDayKey, setSelectedDayKey] = useState(firstDayWithSlots);

  useEffect(() => {
    setSelectedDayKey(firstDayWithSlots);
  }, [firstDayWithSlots]);

  useEffect(() => {
    if (!selectedStartUtc) return;
    const stillInSelectedDay = (slotsByDay.get(selectedDayKey) ?? []).some((slot) => slot.startUtc === selectedStartUtc);
    if (!stillInSelectedDay) {
      setSelectedStartUtc(null);
    }
  }, [selectedDayKey, selectedStartUtc, slotsByDay]);

  async function submit() {
    if (!selectedStartUtc) return;

    setPending(true);
    setState(null);

    const chosen = mapped.find((slot) => slot.startUtc === selectedStartUtc);
    if (!chosen) {
      setPending(false);
      setState({ kind: "error", message: "Selecciona un horario válido antes de enviar." });
      return;
    }

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
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? "No se pudo enviar la solicitud." });
      setPending(false);
      return;
    }

    setState({ kind: "success", message: "Solicitud enviada. Estado: pendiente de aprobación." });
    setPending(false);
    router.refresh();
  }

  if (!slots.length) {
    return (
      <Card>
        <CardTitle>No hay espacios disponibles esta semana</CardTitle>
        <CardDescription>Tu profesora agregará más horarios pronto.</CardDescription>
      </Card>
    );
  }

  const selectedSlot = mapped.find((slot) => slot.startUtc === selectedStartUtc) ?? null;
  const selectedDaySlots = slotsByDay.get(selectedDayKey) ?? [];

  return (
    <Card>
      <CardTitle>Reagendar en 2 clics</CardTitle>
      <CardDescription>1) Toca un horario en calendario 2) Envía solicitud</CardDescription>
      <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
        Horarios mostrados en tu zona local: <span className="font-semibold text-[var(--color-ink)]">{timezone}</span>
      </p>

      <div className="mt-4 md:hidden">
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            {week.map((date) => {
              const key = dayKeyInTimezone(date, timezone);
              const active = key === selectedDayKey;
              const count = slotsByDay.get(key)?.length ?? 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDayKey(key)}
                  className={cn(
                    "min-w-[6.4rem] rounded-2xl border px-3 py-2 text-left transition",
                    active
                      ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[var(--shadow-glow)]"
                      : "border-[var(--color-border)] bg-white/68 text-[var(--color-ink-soft)]",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em]">{labelDay(date, timezone)}</p>
                  <p className="mt-1 text-[11px]">{count ? `${count} horario(s)` : "Sin espacios"}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {selectedDaySlots.length ? (
            selectedDaySlots.map((slot) => (
              <button
                key={slot.startUtc}
                type="button"
                onClick={() => setSelectedStartUtc(slot.startUtc)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-sm transition",
                  selectedStartUtc === slot.startUtc
                    ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[var(--shadow-glow)]"
                    : "border-[var(--color-border)] bg-white/68 text-[var(--color-ink)]",
                )}
              >
                {labelTime(slot.startDate, timezone)}
              </button>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-ink-soft)]">
              No hay espacios para este día.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-7">
        {week.map((date) => {
          const key = dayKeyInTimezone(date, timezone);
          const daySlots = slotsByDay.get(key) ?? [];
          return (
            <div key={key} className="rounded-xl border border-[var(--color-border)] bg-white/68 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">{labelDay(date, timezone)}</p>
              <div className="mt-2 space-y-1.5">
                {daySlots.length ? (
                  daySlots.map((slot) => (
                    <button
                      key={slot.startUtc}
                      type="button"
                      onClick={() => {
                        setSelectedDayKey(key);
                        setSelectedStartUtc(slot.startUtc);
                      }}
                      className={cn(
                        "w-full rounded-lg border px-2 py-1.5 text-left text-xs transition",
                        selectedStartUtc === slot.startUtc
                          ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]"
                          : "border-[var(--color-border)] bg-white text-[var(--color-ink-soft)]",
                      )}
                    >
                      {labelTime(slot.startDate, timezone)}
                    </button>
                  ))
                ) : (
                  <p className="text-[11px] text-[var(--color-ink-soft)]">Sin espacios.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-[var(--color-border)] bg-white/75 px-4 py-3 text-sm">
        {selectedSlot ? (
          <p>
            Horario elegido:{" "}
            <span className="font-semibold text-[var(--color-ink)]">
              {new Date(selectedSlot.startUtc).toLocaleString("es-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: timezone,
              })}
            </span>
          </p>
        ) : (
          <p className="text-[var(--color-ink-soft)]">Selecciona un horario en el calendario para continuar.</p>
        )}
      </div>

      <Button className="mt-4 w-full" variant="gold" onClick={submit} disabled={pending || !selectedSlot}>
        {pending ? "Enviando..." : "Proponer nuevo horario"}
      </Button>
      {state ? (
        <p
          className={`mt-3 rounded-[1.2rem] px-4 py-3 text-sm ${
            state.kind === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </Card>
  );
}
