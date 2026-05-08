"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/dictionary";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { buildWeekInTimezone, dayKeyInTimezone, labelDay, labelTime } from "@/components/schedule/calendar-utils";

type RescheduleSlot = {
  startUtc: string;
  endUtc: string;
};

type CalendarSession = {
  id: string;
  startsAtUtc: string;
  lessonFocus: string | null;
};

export function RescheduleWidget({
  sessionId,
  sessions = [],
  slots,
  timezone,
  weekStartUtc,
  locale,
}: {
  sessionId: string;
  sessions?: CalendarSession[];
  slots: RescheduleSlot[];
  timezone: string;
  weekStartUtc: string;
  locale: AppLocale;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
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

  const mappedSessions = useMemo(
    () =>
      sessions.map((session) => ({
        ...session,
        startsAtDate: new Date(session.startsAtUtc),
      })),
    [sessions],
  );

  const week = useMemo(() => buildWeekInTimezone(timezone, 1, new Date(weekStartUtc)), [timezone, weekStartUtc]);
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

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, typeof mappedSessions>();
    for (const session of mappedSessions) {
      const key = dayKeyInTimezone(session.startsAtDate, timezone);
      const current = grouped.get(key) ?? [];
      current.push(session);
      grouped.set(key, current.sort((a, b) => a.startsAtDate.getTime() - b.startsAtDate.getTime()));
    }
    return grouped;
  }, [mappedSessions, timezone]);

  const dayKeys = useMemo(() => week.map((date) => dayKeyInTimezone(date, timezone)), [week, timezone]);
  const firstDayWithSlots = useMemo(() => dayKeys.find((key) => (slotsByDay.get(key)?.length ?? 0) > 0) ?? dayKeys[0] ?? "", [dayKeys, slotsByDay]);
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
      setState({ kind: "error", message: dictionary.schedule.invalidSlot });
      return;
    }

    const response = await fetch("/api/reschedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        proposedStartUtc: chosen.startUtc,
        proposedEndUtc: chosen.endUtc,
        studentMessage: dictionary.schedule.quickRequestMessage,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? dictionary.common.error });
      setPending(false);
      return;
    }

    setState({ kind: "success", message: dictionary.schedule.success });
    setPending(false);
    router.refresh();
  }

  if (!slots.length) {
    return (
      <Card>
        <CardTitle>{dictionary.schedule.noSpacesWeek}</CardTitle>
        <CardDescription>{dictionary.schedule.noSpacesWeekCopy}</CardDescription>
      </Card>
    );
  }

  const selectedSlot = mapped.find((slot) => slot.startUtc === selectedStartUtc) ?? null;
  const selectedDaySlots = slotsByDay.get(selectedDayKey) ?? [];
  const selectedDaySessions = sessionsByDay.get(selectedDayKey) ?? [];
  const slotGroups = groupSlotsByPeriod(selectedDaySlots, timezone, [
    dictionary.schedule.morning,
    dictionary.schedule.afternoon,
    dictionary.schedule.evening,
  ]);
  const selectedSummary = selectedSlot
    ? new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: timezone,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(selectedSlot.startDate)
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{dictionary.schedule.chooseNew}</CardTitle>
              <CardDescription>{dictionary.schedule.chooseDescription}</CardDescription>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/76 px-3 py-1.5 text-xs text-[var(--color-ink-soft)]">
              <Clock3 className="h-3.5 w-3.5" />
              {timezone}
            </div>
          </div>

          <div className="-mx-1 mt-5 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1 xl:grid xl:min-w-0 xl:grid-cols-7">
              {week.map((date) => {
                const key = dayKeyInTimezone(date, timezone);
                const active = key === selectedDayKey;
                const count = slotsByDay.get(key)?.length ?? 0;
                const hasClass = (sessionsByDay.get(key)?.length ?? 0) > 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDayKey(key)}
                    className={cn(
                      "min-w-[7.25rem] rounded-[1rem] border px-3 py-3 text-left transition xl:min-w-0",
                      active
                        ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[var(--shadow-glow)]"
                        : "border-[var(--color-border)] bg-white/72 text-[var(--color-ink-soft)] hover:bg-white",
                    )}
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em]">{labelDay(date, timezone, locale)}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-display text-2xl leading-none">{count}</span>
                      {hasClass ? <CalendarDays className="h-4 w-4" /> : null}
                    </div>
                    <p className="mt-1 text-[11px]">{dictionary.schedule.spaces}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[1.15rem] border border-[var(--color-border)] bg-white/68 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{dictionary.schedule.currentClass}</p>
              <div className="mt-3 space-y-3">
                {selectedDaySessions.length ? (
                  selectedDaySessions.map((session) => (
                    <div key={session.id} className="rounded-[0.95rem] bg-[var(--color-gold-soft)] px-3 py-3">
                      <p className="font-semibold text-[var(--color-gold-deep)]">{labelTime(session.startsAtDate, timezone, locale)}</p>
                      <p className="mt-1 text-sm text-[var(--color-gold-deep)]">{session.lessonFocus ?? dictionary.student.personalizedSession}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[var(--color-ink-soft)]">{dictionary.schedule.noClassDay}</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.15rem] border border-[var(--color-border)] bg-white/68 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{dictionary.schedule.availableTimes}</p>
              {selectedDaySlots.length ? (
                <div className="mt-3 space-y-4">
                  {slotGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 text-xs font-semibold text-[var(--color-ink-soft)]">{group.label}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {group.slots.map((slot) => (
                          <button
                            key={slot.startUtc}
                            type="button"
                            onClick={() => setSelectedStartUtc(slot.startUtc)}
                            className={cn(
                              "rounded-[0.9rem] border px-3 py-2 text-left text-sm font-semibold transition",
                              selectedStartUtc === slot.startUtc
                                ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)]"
                                : "border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[color-mix(in_srgb,var(--color-gold)_44%,white)]",
                            )}
                          >
                            {labelTime(slot.startDate, timezone, locale)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-[1rem] border border-dashed border-[var(--color-border)] bg-white/58 px-4 py-6 text-sm text-[var(--color-ink-soft)]">
                  {dictionary.schedule.noSpacesDay}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/82 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{dictionary.schedule.request}</p>
            <div className="mt-4 rounded-[1rem] bg-[var(--color-paper)] px-4 py-4">
              {selectedSummary ? (
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{dictionary.schedule.newTime}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{selectedSummary}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--color-ink-soft)]">{dictionary.schedule.chooseSlot}</p>
              )}
            </div>
            <div className="mt-4 text-sm leading-6 text-[var(--color-ink-soft)]">
              <p className="font-semibold text-[var(--color-ink)]">{dictionary.schedule.policy}</p>
              <p>{dictionary.schedule.policyCopy}</p>
            </div>
            <Button className="mt-4 w-full" variant="gold" onClick={submit} disabled={pending || !selectedSlot}>
              {pending ? dictionary.schedule.sending : dictionary.schedule.propose}
            </Button>
          </div>
        </aside>
      </div>
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

function groupSlotsByPeriod<T extends { startDate: Date }>(slots: T[], timezone: string, labels: [string, string, string]) {
  const groups = [
    { label: labels[0], slots: [] as T[] },
    { label: labels[1], slots: [] as T[] },
    { label: labels[2], slots: [] as T[] },
  ];

  for (const slot of slots) {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(slot.startDate),
    );

    if (hour < 12) groups[0].slots.push(slot);
    else if (hour < 18) groups[1].slots.push(slot);
    else groups[2].slots.push(slot);
  }

  return groups.filter((group) => group.slots.length > 0);
}
