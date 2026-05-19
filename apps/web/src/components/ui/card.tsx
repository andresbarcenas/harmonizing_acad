import { cn } from "@/lib/utils";

type CardVariant = "default" | "subtle" | "inset" | "interactive";
type CardDensity = "default" | "compact" | "loose";

const cardVariants: Record<CardVariant, string> = {
  default: "border-[var(--color-border)] bg-[var(--color-paper-elevated)] shadow-[var(--shadow-card)] backdrop-blur-[14px]",
  subtle: "border-[var(--color-border)] bg-[var(--color-surface-glass)] shadow-[0_12px_34px_rgba(68,47,27,0.045)] backdrop-blur-[12px]",
  inset: "border-[var(--color-border)] bg-[var(--color-surface-inset)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
  interactive:
    "interactive-lift border-[var(--color-border)] bg-[var(--color-paper-elevated)] shadow-[var(--shadow-card)] backdrop-blur-[14px] hover:border-[color-mix(in_srgb,var(--color-gold)_28%,var(--color-border))] focus-within:border-[color-mix(in_srgb,var(--color-gold)_34%,var(--color-border))]",
};

const cardDensity: Record<CardDensity, string> = {
  default: "p-5 md:p-6",
  compact: "p-4 md:p-5",
  loose: "p-5 md:p-7",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  density?: CardDensity;
}

export function Card({ className, variant = "default", density = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-2xl)] border",
        cardVariants[variant],
        cardDensity[density],
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-tight tracking-[-0.02em] text-[var(--color-ink)] md:text-lg", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm leading-6 text-[var(--color-ink-soft)]", className)} {...props} />;
}
