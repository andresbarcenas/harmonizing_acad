import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale, normalizeLocalePreference, type AppLocale } from "@/lib/i18n/locales";

export function localeFromAcceptLanguage(value: string | null | undefined): AppLocale | null {
  if (!value) return null;

  const preferred = value
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;
      return {
        tag: tag.toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((item) => item.tag && item.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const item of preferred) {
    const primary = item.tag.split("-")[0];
    if (primary === "es") return "es";
    if (primary === "en") return "en";
  }

  return null;
}

export async function getCookieLocale(): Promise<AppLocale> {
  return getRequestLocale();
}

export async function getBrowserLocale(): Promise<AppLocale> {
  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getRequestLocale(accountLocale?: string | null): Promise<AppLocale> {
  const savedPreference = normalizeLocalePreference(accountLocale);
  if (savedPreference) return savedPreference;

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  return getBrowserLocale();
}
