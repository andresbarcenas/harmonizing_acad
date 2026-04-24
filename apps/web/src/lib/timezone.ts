import { formatInTimeZone } from "date-fns-tz";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

export function detectTimezoneFromHeaders(headerValue: string | null | undefined): string {
  return normalizeIanaTimezone(headerValue);
}

export function formatUtcToLocal(date: Date, timezone: string, pattern = "EEE, MMM d • h:mm a"): string {
  return formatInTimeZone(date, normalizeIanaTimezone(timezone), pattern);
}

export function monthKeyInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, normalizeIanaTimezone(timezone), "yyyy-MM");
}
