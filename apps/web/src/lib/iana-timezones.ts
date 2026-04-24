export const DEFAULT_IANA_TIMEZONE = "America/New_York";

export function isValidIanaTimezone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeIanaTimezone(value: string | null | undefined) {
  const timezone = typeof value === "string" ? value.trim() : "";
  if (!timezone) return DEFAULT_IANA_TIMEZONE;
  return isValidIanaTimezone(timezone) ? timezone : DEFAULT_IANA_TIMEZONE;
}
