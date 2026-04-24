"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

type AvailabilityItem = {
  id: string;
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function toHourLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${mins}`.padStart(2, "0")}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function AvailabilityManager({
  teacherId,
  timezone,
  items,
}: {
  teacherId: string;
  timezone: string;
  items: AvailabilityItem[];
}) {
  const router = useRouter();
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("18:00");
  const [pending, setPending] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { weekday: number; startMinuteLocal: number; endMinuteLocal: number }>
  >(
    Object.fromEntries(
      items.map((slot) => [
        slot.id,
        {
          weekday: slot.weekday,
          startMinuteLocal: slot.startMinuteLocal,
          endMinuteLocal: slot.endMinuteLocal,
        },
      ]),
    ),
  );

  async function createSlot() {
    setPending(true);
    await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        weekday,
        startMinuteLocal: toMinutes(start),
        endMinuteLocal: toMinutes(end),
      }),
    });
    setPending(false);
    router.refresh();
  }

  async function deleteSlot(availabilityId: string) {
    setPending(true);
    await fetch("/api/admin/availability", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityId }),
    });
    setPending(false);
    router.refresh();
  }

  async function updateSlot(availabilityId: string) {
    const draft = drafts[availabilityId];
    if (!draft) return;

    setPending(true);
    await fetch("/api/admin/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        availabilityId,
        teacherId,
        weekday: draft.weekday,
        startMinuteLocal: draft.startMinuteLocal,
        endMinuteLocal: draft.endMinuteLocal,
      }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/75 p-3">
        <div className="min-w-[8.5rem] flex-1">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`weekday-${teacherId}`}>Día</label>
          <select
            id={`weekday-${teacherId}`}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={weekday}
            onChange={(event) => setWeekday(Number(event.target.value))}
          >
            {weekdays.map((day, index) => (
              <option key={day} value={index}>{day}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[8.5rem] flex-1">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`start-${teacherId}`}>Inicio</label>
          <input
            id={`start-${teacherId}`}
            type="time"
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div className="min-w-[8.5rem] flex-1">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`end-${teacherId}`}>Fin</label>
          <input
            id={`end-${teacherId}`}
            type="time"
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        <div className="min-w-[10rem] flex-1 rounded-xl border border-dashed border-[var(--color-border)] bg-white/72 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">Zona base</p>
          <p className="text-sm text-[var(--color-ink)]">{normalizedTimezone}</p>
        </div>
        <Button variant="gold" size="sm" onClick={createSlot} disabled={pending} className="w-full sm:w-auto">
          Agregar bloque
        </Button>
      </div>

      {items.map((slot) => (
        <div key={slot.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
          <div className="flex flex-wrap items-end gap-2">
            <select
              className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-white px-2 text-xs sm:w-auto"
              value={drafts[slot.id]?.weekday ?? slot.weekday}
              onChange={(event) =>
                setDrafts((previous) => ({
                  ...previous,
                  [slot.id]: {
                    ...(previous[slot.id] ?? {
                      weekday: slot.weekday,
                      startMinuteLocal: slot.startMinuteLocal,
                      endMinuteLocal: slot.endMinuteLocal,
                    }),
                    weekday: Number(event.target.value),
                  },
                }))
              }
            >
              {weekdays.map((day, index) => (
                <option key={`${slot.id}-${day}`} value={index}>
                  {day}
                </option>
              ))}
            </select>
            <input
              type="time"
              className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-white px-2 text-xs sm:w-auto"
              value={toHourLabel(drafts[slot.id]?.startMinuteLocal ?? slot.startMinuteLocal)}
              onChange={(event) =>
                setDrafts((previous) => ({
                  ...previous,
                  [slot.id]: {
                    ...(previous[slot.id] ?? {
                      weekday: slot.weekday,
                      startMinuteLocal: slot.startMinuteLocal,
                      endMinuteLocal: slot.endMinuteLocal,
                    }),
                    startMinuteLocal: toMinutes(event.target.value),
                  },
                }))
              }
            />
            <input
              type="time"
              className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-white px-2 text-xs sm:w-auto"
              value={toHourLabel(drafts[slot.id]?.endMinuteLocal ?? slot.endMinuteLocal)}
              onChange={(event) =>
                setDrafts((previous) => ({
                  ...previous,
                  [slot.id]: {
                    ...(previous[slot.id] ?? {
                      weekday: slot.weekday,
                      startMinuteLocal: slot.startMinuteLocal,
                      endMinuteLocal: slot.endMinuteLocal,
                    }),
                    endMinuteLocal: toMinutes(event.target.value),
                  },
                }))
              }
            />
            <Button size="sm" variant="outline" onClick={() => updateSlot(slot.id)} disabled={pending} className="w-full sm:w-auto">
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => deleteSlot(slot.id)} disabled={pending} className="w-full sm:w-auto">
              Eliminar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
