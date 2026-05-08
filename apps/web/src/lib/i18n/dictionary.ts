import { en } from "@/lib/i18n/messages/en";
import { es } from "@/lib/i18n/messages/es";
import { normalizeLocale } from "@/lib/i18n/locales";

const dictionaries = { en, es } as const;

export type Dictionary = typeof en;

export function getDictionary(locale: unknown): Dictionary {
  return dictionaries[normalizeLocale(locale)];
}
