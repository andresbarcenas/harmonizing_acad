import { addDays, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

export function dayKeyInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, normalizeIanaTimezone(timezone), "yyyy-MM-dd");
}

export function buildWeekInTimezone(timezone: string, weekStartsOn: 0 | 1 = 1): Date[] {
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  const zonedNow = toZonedTime(new Date(), normalizedTimezone);
  const localWeekStart = startOfWeek(zonedNow, { weekStartsOn });

  return Array.from({ length: 7 }, (_, index) => {
    const localDay = addDays(localWeekStart, index);
    return fromZonedTime(localDay, normalizedTimezone);
  });
}

export function labelDay(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-US", {
    timeZone: normalizeIanaTimezone(timezone),
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function labelTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-US", {
    timeZone: normalizeIanaTimezone(timezone),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
