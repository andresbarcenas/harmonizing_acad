export const DEFAULT_PRICE_PER_CLASS_COP = 70834;
export const DEFAULT_SESSION_COUNT = 4;
export const VALID_NATIVE_SESSION_COUNTS = [2, 4, 8] as const;

export type NativeSessionCount = (typeof VALID_NATIVE_SESSION_COUNTS)[number];

export function sessionCadenceLabel(sessionCount: number, locale: "en" | "es" = "es") {
  if (sessionCount === 2) return locale === "es" ? "2 sesiones · primera y tercera semana" : "2 sessions · first and third week";
  if (sessionCount === 8) return locale === "es" ? "8 sesiones · dos veces por semana" : "8 sessions · twice weekly";
  return locale === "es" ? "4 sesiones · semanal" : "4 sessions · weekly";
}

export function formatCop(value: number, locale: "en" | "es" = "es") {
  return new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
