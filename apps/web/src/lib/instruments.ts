import type { AppLocale } from "@/lib/i18n/locales";

export const instrumentValues = ["Piano", "Voice"] as const;

export type SupportedInstrument = (typeof instrumentValues)[number];

export const defaultInstrument: SupportedInstrument = "Piano";

export function normalizeInstrument(value?: string | null): SupportedInstrument | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("piano") || normalized === "pi" || normalized === "pianoforte") {
    return "Piano";
  }
  if (
    normalized.includes("voice") ||
    normalized.includes("voz") ||
    normalized.includes("vocal") ||
    normalized.includes("canto") ||
    normalized.includes("sing")
  ) {
    return "Voice";
  }
  return undefined;
}

export function instrumentLabel(value: string | null | undefined, locale: AppLocale = "en") {
  const instrument = normalizeInstrument(value);
  if (!instrument) return value?.trim() || "";
  if (instrument === "Voice") return locale === "es" ? "Voz" : "Voice";
  return "Piano";
}

export function instrumentToSkillInstrument(value?: string | null): "PIANO" | "VOICE" {
  return normalizeInstrument(value) === "Voice" ? "VOICE" : "PIANO";
}

export function skillInstrumentToInstrument(value?: string | null): SupportedInstrument {
  return value === "VOICE" ? "Voice" : "Piano";
}

export function instrumentOptions(locale: AppLocale = "en") {
  return instrumentValues.map((value) => ({ value, label: instrumentLabel(value, locale) }));
}
