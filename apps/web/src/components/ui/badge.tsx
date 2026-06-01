import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold leading-none shadow-[0_6px_18px_rgba(68,47,27,0.035)]", {
  variants: {
    variant: {
      default: "border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-ink-soft)]",
      gold: "border-[color-mix(in_srgb,var(--color-gold)_24%,var(--color-border))] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]",
      success: "border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] text-[var(--color-success)]",
      warning: "border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] text-[var(--color-warning)]",
      danger: "border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] text-[var(--color-danger)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
