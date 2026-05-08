import { formatInTimeZone } from "date-fns-tz";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";

export function formatDate(date: Date | string, locale: AppLocale, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(date));
}

export function formatDateTimeInZone(date: Date | string, timezone: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: normalizeIanaTimezone(timezone),
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTimeInZone(date: Date | string, timezone: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: normalizeIanaTimezone(timezone),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatMoney(value: unknown, currency: string, locale: AppLocale) {
  const numeric = value === null || value === undefined ? null : Number(value);
  if (numeric === null || Number.isNaN(numeric)) return "-";

  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatUtcToLocalLocalized(date: Date, timezone: string, locale: AppLocale, pattern = "EEE, MMM d • h:mm a") {
  return formatInTimeZone(date, normalizeIanaTimezone(timezone), pattern, { locale: undefined });
}
