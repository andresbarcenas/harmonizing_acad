"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "harmonizing:theme";
const THEME_CHANGE_EVENT = "harmonizing:theme-change";
const themeValues = new Set<ThemePreference>(["light", "dark", "system"]);

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themeValues.has(value as ThemePreference);
}

function readCookiePreference(): ThemePreference | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${THEME_STORAGE_KEY}=`))
    ?.split("=")[1];
  if (!cookie) return null;
  const decoded = decodeURIComponent(cookie);
  return isThemePreference(decoded) ? decoded : null;
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    // Local storage can be unavailable in private or restricted contexts.
  }
  return readCookiePreference() ?? "system";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "dark" || preference === "light") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  const resolvedTheme = resolveTheme(preference);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

function persistThemePreference(preference: ThemePreference) {
  applyThemePreference(preference);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Cookie persistence below keeps the app usable when localStorage is unavailable.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent(preference)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: preference }));
}

export function ThemeToggle({
  locale,
  compact = false,
  disabled = false,
  className,
}: {
  locale: AppLocale;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const dictionary = getDictionary(locale);
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const options = useMemo(
    () => [
      {
        value: "light" as const,
        label: dictionary.settings.themeLight,
        description: dictionary.settings.themeLightDescription,
        icon: Sun,
      },
      {
        value: "dark" as const,
        label: dictionary.settings.themeDark,
        description: dictionary.settings.themeDarkDescription,
        icon: Moon,
      },
      {
        value: "system" as const,
        label: dictionary.settings.themeSystem,
        description: dictionary.settings.themeSystemDescription,
        icon: Monitor,
      },
    ],
    [dictionary],
  );

  useEffect(() => {
    function syncFromStorage() {
      const nextPreference = readStoredPreference();
      setPreference(nextPreference);
      const nextResolvedTheme = resolveTheme(nextPreference);
      setResolvedTheme(nextResolvedTheme);
      applyThemePreference(nextPreference);
    }

    syncFromStorage();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const currentPreference = readStoredPreference();
      if (currentPreference !== "system") return;
      applyThemePreference(currentPreference);
      setResolvedTheme(resolveTheme(currentPreference));
    };
    const handleStorageChange = (event: StorageEvent | Event) => {
      if (event instanceof StorageEvent && event.key !== THEME_STORAGE_KEY) return;
      syncFromStorage();
    };

    media.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleStorageChange);

    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleStorageChange);
    };
  }, []);

  function selectTheme(nextPreference: ThemePreference) {
    if (disabled || nextPreference === preference) return;
    setPreference(nextPreference);
    const nextResolvedTheme = resolveTheme(nextPreference);
    setResolvedTheme(nextResolvedTheme);
    persistThemePreference(nextPreference);
  }

  if (compact) {
    return (
      <div
        className={cn("inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-1 shadow-[0_10px_20px_rgba(78,55,30,0.04)]", className)}
        aria-label={dictionary.settings.theme}
      >
        {options.map((option) => {
          const Icon = option.icon;
          const active = preference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              aria-label={option.label}
              title={option.value === "system" ? `${option.label}: ${resolvedTheme}` : option.label}
              disabled={disabled}
              onClick={() => selectTheme(option.value)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50",
                active
                  ? "bg-[var(--color-gold)] text-[var(--color-on-accent)] shadow-[var(--shadow-glow)]"
                  : "text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)] hover:text-[var(--color-gold-deep)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("mt-4 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4", className)}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{dictionary.settings.theme}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">{dictionary.settings.themeDescription}</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;
            const active = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectTheme(option.value)}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                  "rounded-[1.1rem] border px-3 py-3 text-left transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:opacity-50",
                  active
                    ? "border-[color-mix(in_srgb,var(--color-gold)_48%,var(--color-border))] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]"
                    : "border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-ink-soft)] hover:border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))] hover:text-[var(--color-ink)]",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
