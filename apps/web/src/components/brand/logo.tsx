import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  stacked = false,
  className,
}: {
  compact?: boolean;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", stacked && "flex-col gap-4 text-center", className)}>
      <div className="flex h-[3.35rem] w-[3.35rem] flex-col items-center justify-center rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-gold)_24%,white)] bg-white/92 shadow-[var(--shadow-glow)]">
        <span className="font-display text-[0.65rem] uppercase tracking-[0.28em] text-[var(--color-gold-deep)]">h</span>
        <span className="-mt-1 font-display text-[1.7rem] leading-none text-[var(--color-gold)]">2</span>
      </div>
      {!compact && (
        <div>
          <p className="font-display text-[1.75rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]">
            harmoni<span className="text-[var(--color-gold)]">zing</span>
          </p>
          <p className="mt-1 text-[0.58rem] uppercase tracking-[0.34em] text-[var(--color-ink-muted)]">Academia musical</p>
        </div>
      )}
    </div>
  );
}
