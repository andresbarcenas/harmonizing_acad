import { addDays, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

export function dayKeyInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, normalizeIanaTimezone(timezone), "yyyy-MM-dd");
}

export function buildWeekInTimezone(timezone: string, weekStartsOn: 0 | 1 = 1, anchorDate: Date = new Date()): Date[] {
  const normalizedTimezone = normalizeIanaTimezone(timezone);
  const zonedAnchor = toZonedTime(anchorDate, normalizedTimezone);
  const localWeekStart = startOfWeek(zonedAnchor, { weekStartsOn });

  return Array.from({ length: 7 }, (_, index) => {
    const localDay = addDays(localWeekStart, index);
    return fromZonedTime(localDay, normalizedTimezone);
  });
}

export function labelDay(date: Date, timezone: string, locale: AppLocale = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: normalizeIanaTimezone(timezone),
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function labelTime(date: Date, timezone: string, locale: AppLocale = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: normalizeIanaTimezone(timezone),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
