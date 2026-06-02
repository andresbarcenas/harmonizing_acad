"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locales";

type ClassInProgressCardProps = {
  startedAt: string;
  startsAtUtc: string;
  endsAtUtc: string;
  locale: AppLocale;
  compact?: boolean;
  completeHref?: string;
  className?: string;
};

const copy = {
  en: {
    title: "Class in progress",
    started: "Started",
    elapsed: "Elapsed",
    remaining: "Remaining",
    overtime: "Over time",
    complete: "Complete / update class",
  },
  es: {
    title: "Clase en progreso",
    started: "Iniciada",
    elapsed: "Transcurrido",
    remaining: "Restante",
    overtime: "Tiempo extra",
    complete: "Completar / actualizar clase",
  },
} as const;

export function ClassInProgressCard({
  startedAt,
  startsAtUtc,
  endsAtUtc,
  locale,
  compact = false,
  completeHref,
  className,
}: ClassInProgressCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const c = copy[locale];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const started = new Date(startedAt).getTime();
    const starts = new Date(startsAtUtc).getTime();
    const ends = new Date(endsAtUtc).getTime();
    const durationMs = Math.max(ends - starts, 60_000);
    const elapsedMs = Math.max(now - started, 0);
    const remainingMs = Math.max(durationMs - elapsedMs, 0);
    const percent = Math.min((elapsedMs / durationMs) * 100, 100);
    const overtimeMs = Math.max(elapsedMs - durationMs, 0);

    return {
      started,
      elapsedMs,
      remainingMs,
      overtimeMs,
      percent,
      isOvertime: overtimeMs > 0,
    };
  }, [endsAtUtc, now, startedAt, startsAtUtc]);

  if (compact) {
    return (
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-[1rem] border border-[color-mix(in_srgb,var(--color-gold)_34%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-gold-soft)_76%,transparent),var(--color-surface-glass))] px-3 py-2",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-gold)] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-gold-deep)]" />
            </span>
            <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{c.title}</p>
          </div>
          <p className="shrink-0 text-[11px] font-semibold text-[var(--color-gold-deep)]">
            {metrics.isOvertime ? `${c.overtime} ${formatDuration(metrics.overtimeMs)}` : formatDuration(metrics.remainingMs)}
          </p>
        </div>
        <ProgressBar percent={metrics.percent} overtime={metrics.isOvertime} className="mt-2" />
      </div>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.8rem] border border-[color-mix(in_srgb,var(--color-gold)_34%,var(--color-border))] bg-[radial-gradient(circle_at_15%_20%,color-mix(in_srgb,var(--color-gold)_24%,transparent),transparent_32%),linear-gradient(135deg,var(--color-paper-elevated),var(--color-surface-inset))] p-5 shadow-[0_22px_60px_rgba(111,73,25,0.12)]",
        className,
      )}
    >
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--color-gold)]/20 blur-2xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-gold)] opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[var(--color-gold-deep)] shadow-[0_0_24px_rgba(198,128,44,0.45)]" />
            </span>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">{c.started}</p>
          </div>
          <h2 className="mt-2 font-display text-3xl font-normal tracking-[-0.055em] text-[var(--color-ink)] sm:text-4xl">{c.title}</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
            {c.started}: {new Date(metrics.started).toLocaleTimeString(locale === "es" ? "es-CO" : "en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[22rem]">
          <Metric label={c.elapsed} value={formatDuration(metrics.elapsedMs)} />
          <Metric
            label={metrics.isOvertime ? c.overtime : c.remaining}
            value={formatDuration(metrics.isOvertime ? metrics.overtimeMs : metrics.remainingMs)}
            emphatic={metrics.isOvertime}
          />
        </div>
      </div>

      <ProgressBar percent={metrics.percent} overtime={metrics.isOvertime} className="relative mt-5" />

      {completeHref ? (
        <div className="relative mt-4">
          <Link href={completeHref}>
            <Button variant="gold" size="sm">{c.complete}</Button>
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function ProgressBar({ percent, overtime, className }: { percent: number; overtime: boolean; className?: string }) {
  return (
    <div
      className={cn("h-3 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-inset)] shadow-inner", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(overtime ? 100 : percent)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-1000 ease-linear",
          overtime
            ? "w-full bg-[linear-gradient(90deg,var(--color-status-warning-bg),var(--color-gold-deep),var(--color-status-warning-bg))] bg-[length:180%_100%] animate-[class-progress-shimmer_1.5s_linear_infinite]"
            : "bg-[linear-gradient(90deg,var(--color-gold),var(--color-gold-deep))]",
        )}
        style={{ width: `${overtime ? 100 : percent}%` }}
      />
    </div>
  );
}

function Metric({ label, value, emphatic = false }: { label: string; value: string; emphatic?: boolean }) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-4 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">{label}</p>
      <p className={cn("mt-1 font-display text-2xl tracking-[-0.045em]", emphatic ? "text-[var(--color-warning)]" : "text-[var(--color-ink)]")}>{value}</p>
    </div>
  );
}

function formatDuration(valueMs: number) {
  const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
