import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale, type AppLocale } from "@/lib/i18n/locales";

export async function getCookieLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
}
