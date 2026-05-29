"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TimezoneSelect } from "@/components/system/timezone-select";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type TimezonePreferenceFormProps = {
  currentTimezone: string;
  locale: AppLocale;
};

export function TimezonePreferenceForm({ currentTimezone, locale }: TimezonePreferenceFormProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [timezone, setTimezone] = useState(currentTimezone);
  const browserTimezone = useSyncExternalStore(
    subscribeToBrowserTimezone,
    getBrowserTimezoneSnapshot,
    () => null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveTimezone(nextTimezone = timezone) {
    const trimmed = nextTimezone.trim();
    if (!trimmed) return;

    setPending(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/viewer/timezone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: trimmed }),
    });

    if (!response.ok) {
      setError(dictionary.settings.timezoneSaveError);
      setPending(false);
      return;
    }

    const data = (await response.json().catch(() => null)) as { timezone?: string } | null;
    setTimezone(data?.timezone ?? trimmed);
    setMessage(dictionary.settings.timezoneSaved);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-[1.25rem] border border-[var(--color-border)] bg-white/70 p-4">
      <div className="grid gap-1">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-gold-deep)] uppercase">
          {dictionary.settings.schedulingTimezone}
        </p>
        <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.settings.timezoneDescription}</p>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.settings.schedulingTimezone}</span>
          <TimezoneSelect value={timezone} onChange={setTimezone} locale={locale} required />
        </label>
        <Button type="button" variant="gold" disabled={pending} onClick={() => saveTimezone()}>
          {pending ? dictionary.common.saving : dictionary.common.save}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-[1rem] border border-[var(--color-border)] bg-white/72 px-3 py-2 text-xs text-[var(--color-ink-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          {dictionary.settings.browserDetectedTimezone}: <span className="font-semibold text-[var(--color-ink)]">{browserTimezone ?? "-"}</span>
        </span>
        {browserTimezone && browserTimezone !== timezone ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => saveTimezone(browserTimezone)}>
            {dictionary.settings.useBrowserTimezone}
          </Button>
        ) : null}
      </div>

      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

function getBrowserTimezoneSnapshot() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
}

function subscribeToBrowserTimezone() {
  return () => undefined;
}
