import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-gold)]">
        <span className="font-display text-xl">H</span>
      </div>
      {!compact && (
        <div>
          <p className="font-display text-xl leading-none tracking-[0.08em] text-[var(--color-ink)]">HARMONIZING</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">Academia musical premium</p>
        </div>
      )}
    </div>
  );
}
