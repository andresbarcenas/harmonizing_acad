import type { SelectHTMLAttributes } from "react";

import { defaultInstrument, instrumentLabel, instrumentOptions, normalizeInstrument } from "@/lib/instruments";
import type { AppLocale } from "@/lib/i18n/locales";

const defaultClassName = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";

type InstrumentSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "defaultValue" | "value"> & {
  locale?: AppLocale;
  defaultValue?: string | null;
  value?: string | null;
  compact?: boolean;
};

export function InstrumentSelect({ locale = "en", defaultValue, value, compact, className, ...props }: InstrumentSelectProps) {
  const normalizedDefault = normalizeInstrument(defaultValue) ?? defaultInstrument;
  const normalizedValue = value === undefined ? undefined : normalizeInstrument(value) ?? defaultInstrument;
  const classes = className ?? (compact ? "h-[3.05rem] w-full rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]" : defaultClassName);

  return (
    <select
      {...props}
      value={normalizedValue}
      defaultValue={normalizedValue === undefined ? normalizedDefault : undefined}
      className={classes}
    >
      {instrumentOptions(locale).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function displayInstrument(value: string | null | undefined, locale: AppLocale = "en") {
  return instrumentLabel(value, locale);
}
