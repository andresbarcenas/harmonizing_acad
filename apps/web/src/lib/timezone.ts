import { formatInTimeZone } from "date-fns-tz";

export function detectTimezoneFromHeaders(headerValue: string | null | undefined): string {
  if (!headerValue) {
    return "America/New_York";
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: headerValue });
    return headerValue;
  } catch {
    return "America/New_York";
  }
}

export function formatUtcToLocal(date: Date, timezone: string, pattern = "EEE, MMM d • h:mm a"): string {
  return formatInTimeZone(date, timezone, pattern);
}

export function monthKeyInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM");
}
