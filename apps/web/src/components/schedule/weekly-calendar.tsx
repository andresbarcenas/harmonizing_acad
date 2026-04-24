import { Badge } from "@/components/ui/badge";
import { buildWeekInTimezone, dayKeyInTimezone, labelDay, labelTime } from "@/components/schedule/calendar-utils";

type SessionItem = {
  id: string;
  startsAtUtc: Date;
  lessonFocus: string | null;
};

type SlotItem = {
  startUtc: Date;
};

export function WeeklyCalendar({
  timezone,
  sessions,
  slots,
}: {
  timezone: string;
  sessions: SessionItem[];
  slots: SlotItem[];
}) {
  const week = buildWeekInTimezone(timezone);

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

  function DayColumn({ date }: { date: Date }) {
    const key = dayKeyInTimezone(date, timezone);
    const daySessions = sessionsByDay.get(key) ?? [];
    const daySlots = slotsByDay.get(key) ?? [];

    return (
      <div key={key} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/74 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">{labelDay(date, timezone)}</p>

        <div className="mt-3 space-y-1.5">
          {daySessions.length ? (
            daySessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-[var(--color-gold)] bg-[var(--color-gold-soft)] px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--color-gold-deep)]">{labelTime(session.startsAtUtc, timezone)}</span>
                  <Badge variant="gold">Clase</Badge>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-gold-deep)]">{session.lessonFocus ?? "Clase personalizada"}</p>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-[var(--color-ink-soft)]">Sin clases agendadas.</p>
          )}
        </div>

        <div className="soft-divider my-3" />
        <p className="text-[11px] font-medium text-[var(--color-ink-soft)]">Disponibilidad docente</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {daySlots.length ? (
            daySlots.map((slot) => (
              <span key={slot.startUtc.toISOString()} className="rounded-full border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] text-[var(--color-ink-soft)]">
                {labelTime(slot.startUtc, timezone)}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[var(--color-ink-soft)]">Sin espacios.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="-mx-1 overflow-x-auto pb-1 md:hidden">
        <div className="grid min-w-[50rem] grid-cols-7 gap-3 px-1">
          {week.map((date) => (
            <DayColumn key={dayKeyInTimezone(date, timezone)} date={date} />
          ))}
        </div>
      </div>
      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-7">
        {week.map((date) => (
          <DayColumn key={dayKeyInTimezone(date, timezone)} date={date} />
        ))}
      </div>
    </>
  );
}
