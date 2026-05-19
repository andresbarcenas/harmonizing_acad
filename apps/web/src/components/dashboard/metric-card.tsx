import { Card, CardDescription } from "@/components/ui/card";

export function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card density="compact" className="relative overflow-hidden">
      <div className="absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-gold),transparent)] opacity-45" />
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">{title}</p>
      <p className="mt-2 break-words font-display text-[2rem] leading-none tracking-[-0.055em] text-[var(--color-ink)] sm:text-[2.35rem]">{value}</p>
      {subtitle ? <CardDescription className="mt-2 text-xs leading-5">{subtitle}</CardDescription> : null}
    </Card>
  );
}
