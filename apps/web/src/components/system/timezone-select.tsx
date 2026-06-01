"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getSupportedIanaTimezones } from "@/lib/iana-timezones";
import type { AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type TimezoneSelectProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  locale?: AppLocale;
  placeholder?: string;
  className?: string;
};

export function TimezoneSelect({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  disabled,
  required,
  locale = "en",
  placeholder,
  className,
}: TimezoneSelectProps) {
  const generatedId = useId();
  const inputId = id ?? `timezone-select-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? value : internalValue;
  const [search, setSearch] = useState(selectedValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timezones = useMemo(() => getSupportedIanaTimezones(), []);
  const normalizedSearch = normalizeTimezoneSearch(search);
  const options = useMemo(() => {
    if (!normalizedSearch) return timezones;
    return timezones.filter((timezone) => {
      const normalizedTimezone = normalizeTimezoneSearch(timezone);
      return normalizedTimezone.includes(normalizedSearch) || timezone.toLowerCase().includes(search.toLowerCase());
    });
  }, [normalizedSearch, search, timezones]);
  const visibleOptions = options.slice(0, 120);
  const searchPlaceholder = placeholder ?? (locale === "es" ? "Busca una zona horaria..." : "Search timezone...");

  const commitTimezone = useCallback((nextTimezone: string) => {
    if (!isControlled) setInternalValue(nextTimezone);
    onChange?.(nextTimezone);
    setSearch(nextTimezone);
    setOpen(false);
  }, [isControlled, onChange]);

  const findBestSearchMatch = useCallback(() => {
    const normalized = normalizeTimezoneSearch(search);
    if (!normalized) return "";

    const exactMatch = timezones.find((timezone) => normalizeTimezoneSearch(timezone) === normalized || timezone.toLowerCase() === search.toLowerCase());
    if (exactMatch) return exactMatch;

    return visibleOptions.length === 1 ? visibleOptions[0] : null;
  }, [search, timezones, visibleOptions]);

  const closeDropdown = useCallback(() => {
    const bestMatch = findBestSearchMatch();
    if (bestMatch) {
      commitTimezone(bestMatch);
      return;
    }
    setOpen(false);
    setSearch(selectedValue);
  }, [commitTimezone, findBestSearchMatch, selectedValue]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeDropdown]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) commitTimezone(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setSearch(selectedValue);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={open ? search : selectedValue}
          disabled={disabled}
          required={required && !selectedValue}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={open && visibleOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          placeholder={searchPlaceholder}
          onChange={(event) => {
            const nextSearch = event.target.value;
            setSearch(nextSearch);
            setOpen(true);
            setActiveIndex(0);
            if (!nextSearch.trim()) {
              if (!isControlled) setInternalValue("");
              onChange?.("");
            }
          }}
          onFocus={() => {
            setSearch(selectedValue);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="h-[3.35rem] w-full rounded-[1.2rem] control-surface px-4 text-sm placeholder:text-[var(--color-ink-muted)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,var(--color-border))] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          type="button"
          variant="outline"
          aria-label={locale === "es" ? "Abrir zonas horarias" : "Open timezones"}
          disabled={disabled}
          className="h-[3.35rem] shrink-0 px-4"
          onClick={() => {
            if (!open) {
              setSearch(selectedValue);
              setActiveIndex(0);
            }
            setOpen((value) => !value);
          }}
        >
          <span aria-hidden="true">⌄</span>
        </Button>
      </div>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-[1.1rem] border border-[var(--color-border-strong)] bg-[var(--color-paper-elevated)] p-1 shadow-[var(--shadow-card)]"
        >
          {visibleOptions.map((timezone, index) => {
            const active = index === activeIndex;
            const selected = timezone === selectedValue;
            return (
              <button
                key={timezone}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center justify-between rounded-[0.9rem] px-3 py-2 text-left text-sm transition-colors duration-150",
                  active ? "bg-[var(--color-gold-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]",
                  selected ? "font-semibold text-[var(--color-gold-deep)]" : "",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitTimezone(timezone)}
              >
                <span>{timezone}</span>
                {selected ? <span className="text-xs text-[var(--color-gold-deep)]">{locale === "es" ? "Seleccionada" : "Selected"}</span> : null}
              </button>
            );
          })}
          {!visibleOptions.length ? (
            <p className="px-3 py-3 text-sm text-[var(--color-ink-soft)]">{locale === "es" ? "No hay zonas horarias coincidentes." : "No matching timezones."}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function normalizeTimezoneSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[_/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
