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

    return (
      <div
        key={key}
        className={cn(
          "min-w-0 rounded-[1.1rem] border px-3 py-3",
          hasActivity ? "border-[var(--color-border)] bg-white/82" : "border-transparent bg-white/42",
        )}
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
          {labelDay(date, timezone, locale)}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-2xl leading-none text-[var(--color-ink)]">{daySlots.length}</p>
            <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">{dictionary.schedule.spaces}</p>
          </div>
          {daySessions[0] ? (
            <div className="text-right">
              <Link href={`/classes/${daySessions[0].id}`} className="rounded-full bg-[var(--color-gold-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-gold-deep)] transition hover:bg-[var(--color-gold)] hover:text-white">
                {labelTime(daySessions[0].startsAtUtc, timezone, locale)}
              </Link>
              {daySessions[0].type ? (
                <p className="mt-1 max-w-[5.8rem] truncate text-[10px] font-semibold text-[var(--color-ink-soft)]">
                  {classTypeLabel(daySessions[0].type, locale)}
                </p>
              ) : null}
              {daySessions[0].attachmentCount ? (
                <p className="mt-1 max-w-[5.8rem] truncate text-[10px] font-semibold text-[var(--color-gold-deep)]">
                  {locale === "es" ? "Materiales" : "Files"}: {daySessions[0].attachmentCount}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/56 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{dictionary.schedule.weeklyView}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{dictionary.schedule.summary}</p>
        </div>
        <div className="hidden rounded-full border border-[var(--color-border)] bg-white/78 px-3 py-1 text-xs text-[var(--color-ink-soft)] sm:block">
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
