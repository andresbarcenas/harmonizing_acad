"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type AvailabilityItem = {
  id: string;
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

type BlackoutItem = {
  id: string;
  localDate: string;
  note?: string | null;
  affectedSessions?: Array<{ id: string; label: string }>;
};

const weekdays = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
} as const;

const blackoutCopy = {
  en: {
    title: "Blackout dates",
    description: "Mark full days when this teacher is unavailable. Existing classes are not changed automatically.",
    date: "Unavailable day",
    note: "Reason / note",
    add: "Add blackout",
    scheduledWarning: "This day already has scheduled classes:",
    empty: "No blackout dates yet.",
    delete: "Delete",
  },
  es: {
    title: "Días no disponibles",
    description: "Marca días completos en los que esta docente no está disponible. Las clases existentes no se cambian automáticamente.",
    date: "Día no disponible",
    note: "Motivo / nota",
    add: "Agregar día",
    scheduledWarning: "Este día ya tiene clases agendadas:",
    empty: "Aún no hay días bloqueados.",
    delete: "Eliminar",
  },
} as const;

function toHourLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${mins}`.padStart(2, "0")}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function BlackoutDateManager({
  teacherId,
  items,
  locale = "en",
  endpoint,
  includeTeacherId = true,
}: {
  teacherId: string;
  items: BlackoutItem[];
  locale?: AppLocale;
  endpoint: string;
  includeTeacherId?: boolean;
}) {
  const router = useRouter();
  const c = blackoutCopy[locale];
  const [localDate, setLocalDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function createBlackout() {
    setPending(true);
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(includeTeacherId ? { teacherId } : {}),
        localDate,
        note,
      }),
    });
    setPending(false);
    setNote("");
    router.refresh();
  }

  async function deleteBlackout(blackoutId: string) {
    setPending(true);
    await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blackoutId }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/58 p-3">
      <div>
        <p className="text-sm font-semibold text-[var(--color-ink)]">{c.title}</p>
        <p className="text-xs text-[var(--color-ink-soft)]">{c.description}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`blackout-date-${teacherId}`}>{c.date}</label>
          <input
            id={`blackout-date-${teacherId}`}
            type="date"
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={localDate}
            onChange={(event) => setLocalDate(event.target.value)}
          />
        </div>
        <div className="min-w-[12rem] flex-[2]">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`blackout-note-${teacherId}`}>{c.note}</label>
          <input
            id={`blackout-note-${teacherId}`}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <Button variant="gold" size="sm" onClick={createBlackout} disabled={pending || !localDate} className="w-full sm:w-auto">
          {c.add}
        </Button>
      </div>

      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--color-border)] bg-white/72 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{item.localDate}</p>
                  {item.note ? <p className="text-xs text-[var(--color-ink-soft)]">{item.note}</p> : null}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteBlackout(item.id)} disabled={pending} className="w-full sm:w-auto">
                  {c.delete}
                </Button>
              </div>
              {item.affectedSessions?.length ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-semibold">{c.scheduledWarning}</p>
                  <ul className="mt-1 list-disc pl-4">
                    {item.affectedSessions.map((session) => <li key={session.id}>{session.label}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-ink-soft)]">{c.empty}</p>
      )}
    </div>
  );
}

export function AvailabilityManager({
  teacherId,
  timezone,
  items,
  locale = "en",
  endpoint = "/api/admin/availability",
  includeTeacherId = true,
}: {
  teacherId: string;
  timezone: string;
  items: AvailabilityItem[];
  locale?: AppLocale;
  endpoint?: string;
  includeTeacherId?: boolean;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
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
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(includeTeacherId ? { teacherId } : {}),
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
    await fetch(endpoint, {
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
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        availabilityId,
        ...(includeTeacherId ? { teacherId } : {}),
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
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`weekday-${teacherId}`}>{dictionary.common.day}</label>
          <select
            id={`weekday-${teacherId}`}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={weekday}
            onChange={(event) => setWeekday(Number(event.target.value))}
          >
            {weekdays[locale].map((day, index) => (
              <option key={day} value={index}>{day}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[8.5rem] flex-1">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`start-${teacherId}`}>{dictionary.common.start}</label>
          <input
            id={`start-${teacherId}`}
            type="time"
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div className="min-w-[8.5rem] flex-1">
          <label className="text-xs text-[var(--color-ink-soft)]" htmlFor={`end-${teacherId}`}>{dictionary.common.end}</label>
          <input
            id={`end-${teacherId}`}
            type="time"
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        <div className="min-w-[10rem] flex-1 rounded-xl border border-dashed border-[var(--color-border)] bg-white/72 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">{dictionary.common.baseTimezone}</p>
          <p className="text-sm text-[var(--color-ink)]">{normalizedTimezone}</p>
        </div>
        <Button variant="gold" size="sm" onClick={createSlot} disabled={pending} className="w-full sm:w-auto">
          {dictionary.common.addBlock}
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
              {weekdays[locale].map((day, index) => (
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
              {dictionary.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => deleteSlot(slot.id)} disabled={pending} className="w-full sm:w-auto">
              {dictionary.common.delete}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
