import Link from "next/link";

import { buildWeekInTimezone, dayKeyInTimezone, labelDay, labelTime } from "@/components/schedule/calendar-utils";
import { classTypeLabel } from "@/lib/class-session-labels";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type SessionItem = {
  id: string;
  startsAtUtc: Date;
  lessonFocus: string | null;
  type?: string;
  attachmentCount?: number;
};

type SlotItem = {
  startUtc: Date;
};

export function WeeklyCalendar({
  timezone,
  sessions,
  slots,
  weekStartUtc,
  locale,
}: {
  timezone: string;
  sessions: SessionItem[];
  slots: SlotItem[];
  weekStartUtc: Date;
  locale: AppLocale;
}) {
  const dictionary = getDictionary(locale);
  const week = buildWeekInTimezone(timezone, 1, weekStartUtc);
  const todayKey = dayKeyInTimezone(new Date(), timezone);

  const sessionsByDay = new Map<string, SessionItem[]>();
  const slotsByDay = new Map<string, SlotItem[]>();

  for (const session of sessions) {
    const key = dayKeyInTimezone(session.startsAtUtc, timezone);
    const current = sessionsByDay.get(key) ?? [];
    current.push(session);
    sessionsByDay.set(key, current.sort((a, b) => a.startsAtUtc.getTime() - b.startsAtUtc.getTime()));
  }

  for (const slot of slots) {
    const key = dayKeyInTimezone(slot.startUtc, timezone);
    const current = slotsByDay.get(key) ?? [];
    current.push(slot);
    slotsByDay.set(key, current.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime()));
  }

  function DaySummary({ date }: { date: Date }) {
    const key = dayKeyInTimezone(date, timezone);
    const daySessions = sessionsByDay.get(key) ?? [];
    const daySlots = slotsByDay.get(key) ?? [];
    const hasActivity = daySessions.length > 0 || daySlots.length > 0;
    const isToday = key === todayKey;
    const heatWidth = `${Math.min(100, Math.max(12, daySlots.length * 18))}%`;

    return (
      <div
        key={key}
        className={cn(
          "group min-w-0 rounded-[1.35rem] border px-3.5 py-3.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
          hasActivity ? "border-[var(--color-border)] bg-[var(--color-paper-elevated)]" : "border-transparent bg-white/38",
          isToday ? "border-[color-mix(in_srgb,var(--color-gold)_38%,white)] shadow-[0_12px_34px_rgba(135,83,29,0.08)]" : "",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            {labelDay(date, timezone, locale)}
          </p>
          {isToday ? (
            <span className="rounded-full bg-[var(--color-gold-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold-deep)]">
              {locale === "es" ? "Hoy" : "Today"}
            </span>
          ) : null}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-inset)]">
          <div
            className={cn(
              "h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold-soft),var(--color-gold))] transition-all duration-200 ease-out",
              daySlots.length ? "opacity-100" : "opacity-30",
            )}
            style={{ width: heatWidth }}
          />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[2rem] leading-none tracking-[-0.05em] text-[var(--color-ink)]">{daySlots.length}</p>
            <p className="mt-1 text-[11px] font-medium text-[var(--color-ink-soft)]">{dictionary.schedule.spaces}</p>
          </div>
          {daySessions.length ? (
            <div className="grid max-w-[7.4rem] gap-1 text-right">
              {daySessions.slice(0, 2).map((session) => (
                <Link
                  key={session.id}
                  href={`/classes/${session.id}`}
                  className="rounded-full border border-[color-mix(in_srgb,var(--color-gold)_22%,white)] bg-[var(--color-gold-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-gold-deep)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-gold)] hover:text-white focus:ring-2 focus:ring-[var(--focus-ring)] focus:outline-none"
                >
                  {labelTime(session.startsAtUtc, timezone, locale)}
                </Link>
              ))}
              {daySessions.length > 2 ? (
                <p className="text-[10px] font-semibold text-[var(--color-ink-muted)]">+{daySessions.length - 2}</p>
              ) : null}
              {daySessions[0]?.type ? (
                <p className="truncate text-[10px] font-semibold text-[var(--color-ink-soft)]">
                  {classTypeLabel(daySessions[0].type, locale)}
                </p>
              ) : null}
              {daySessions.some((session) => session.attachmentCount) ? (
                <p className="truncate text-[10px] font-semibold text-[var(--color-gold-deep)]">
                  {locale === "es" ? "Materiales" : "Files"}: {daySessions.reduce((total, session) => total + (session.attachmentCount ?? 0), 0)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.55rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-3.5 shadow-[0_12px_34px_rgba(68,47,27,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{dictionary.schedule.weeklyView}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{dictionary.schedule.summary}</p>
        </div>
        <div className="hidden rounded-full border border-[var(--color-border)] bg-[var(--color-paper-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-ink-soft)] sm:block">
          {slots.length} {dictionary.schedule.spaces}
        </div>
      </div>
      <div className="-mx-1 mt-4 pb-1">
        <div className="grid grid-cols-2 gap-2 px-1 sm:grid-cols-4 md:grid-cols-7">
          {week.map((date) => (
            <DaySummary key={dayKeyInTimezone(date, timezone)} date={date} />
          ))}
        </div>
      </div>
    </div>
  );
}
