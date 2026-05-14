"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { getDictionary } from "@/lib/i18n/dictionary";
import { type AppLocale, type LocalePreference } from "@/lib/i18n/locales";
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

type PreferenceChoice = AppLocale | "browser";

export function LanguagePreferenceForm({ locale, preference }: { locale: AppLocale; preference: LocalePreference }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [currentPreference, setCurrentPreference] = useState<PreferenceChoice>(preference ?? "browser");
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  async function changePreference(nextPreference: PreferenceChoice) {
    if (nextPreference === currentPreference || isPending) return;
    const previousPreference = currentPreference;
    const previousLocale = currentLocale;
    setCurrentPreference(nextPreference);

    const response = await fetch("/api/viewer/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextPreference }),
    });

    if (!response.ok) {
      setCurrentPreference(previousPreference);
      setCurrentLocale(previousLocale);
      return;
    }

    const payload = (await response.json().catch(() => null)) as { locale?: AppLocale; preference?: AppLocale | null } | null;
    setCurrentLocale(payload?.locale ?? previousLocale);
    setCurrentPreference(payload?.preference ?? "browser");
    startTransition(() => router.refresh());
  }

  const options: Array<{ value: PreferenceChoice; label: string; description: string }> = [
    {
      value: "browser",
      label: dictionary.settings.browserDefaultLanguage,
      description: dictionary.settings.browserDefaultLanguageDescription,
    },
    {
      value: "en",
      label: dictionary.common.english,
      description: dictionary.settings.permanentLanguageDescription,
    },
    {
      value: "es",
      label: dictionary.common.spanish,
      description: dictionary.settings.permanentLanguageDescription,
    },
  ];

  return (
    <div className="mt-4 rounded-[1.35rem] border border-[var(--color-border)] bg-white/70 p-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{dictionary.settings.primaryLanguage}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">{dictionary.settings.languageDescription}</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {options.map((option) => {
            const active = currentPreference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => changePreference(option.value)}
                disabled={isPending}
                className={cn(
                  "rounded-[1.1rem] border px-3 py-3 text-left transition",
                  active
                    ? "border-[color-mix(in_srgb,var(--color-gold)_48%,white)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]"
                    : "border-[var(--color-border)] bg-white/72 text-[var(--color-ink-soft)] hover:border-[color-mix(in_srgb,var(--color-gold)_30%,white)] hover:text-[var(--color-ink)]",
                )}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5">{option.description}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">
          {dictionary.settings.currentInterfaceLanguage}:{" "}
          <span className="font-semibold text-[var(--color-ink)]">
            {currentLocale === "es" ? dictionary.common.spanish : dictionary.common.english}
          </span>
        </p>
      </div>
    </div>
  );
}
