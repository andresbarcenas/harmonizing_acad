import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
      {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
    </Card>
  );
}
