"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { getDictionary } from "@/lib/i18n/dictionary";
import { type AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

export function LanguageToggle({ locale, authenticated = false, compact = false }: { locale: AppLocale; authenticated?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState<AppLocale>(locale);
  const [isPending, startTransition] = useTransition();
  const dictionary = getDictionary(current);

  async function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === current || isPending) return;
    setCurrent(nextLocale);

    const response = await fetch(authenticated ? "/api/viewer/preferences" : "/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });

    if (!response.ok) {
      setCurrent(current);
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--color-border)] bg-white/76 p-1 shadow-[0_10px_20px_rgba(78,55,30,0.04)]",
        compact ? "gap-0.5" : "gap-1",
      )}
      aria-label={dictionary.common.language}
    >
      {(["en", "es"] as const).map((option) => {
        const active = current === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => changeLocale(option)}
            disabled={isPending}
            className={cn(
              "rounded-full text-xs font-semibold uppercase tracking-[0.08em] transition",
              compact ? "px-2 py-1" : "px-3 py-1.5",
              active ? "bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)] hover:text-[var(--color-gold-deep)]",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function LanguagePreferenceForm({ locale }: { locale: AppLocale }) {
  const dictionary = getDictionary(locale);

  return (
    <div className="mt-4 rounded-[1.35rem] border border-[var(--color-border)] bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{dictionary.settings.primaryLanguage}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">{dictionary.settings.languageDescription}</p>
        </div>
        <LanguageToggle locale={locale} authenticated />
      </div>
    </div>
  );
}
