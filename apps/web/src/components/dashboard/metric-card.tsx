import { Card, CardDescription } from "@/components/ui/card";

export function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">{title}</p>
      <p className="mt-3 break-words font-display text-3xl leading-none tracking-[-0.05em] text-[var(--color-ink)] sm:text-4xl">{value}</p>
      {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
    </Card>
  );
}
