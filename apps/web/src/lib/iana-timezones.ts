export const DEFAULT_IANA_TIMEZONE = "America/New_York";

export const FALLBACK_IANA_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Panama",
  "America/Santo_Domingo",
  "America/Puerto_Rico",
  "America/Caracas",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Australia/Sydney",
] as const;

export function getSupportedIanaTimezones() {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const supported = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? [];
  const source = supported.length ? supported : FALLBACK_IANA_TIMEZONES;
  return Array.from(new Set([DEFAULT_IANA_TIMEZONE, "UTC", ...source])).sort((a, b) => a.localeCompare(b));
}

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
