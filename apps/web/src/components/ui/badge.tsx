import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold leading-none shadow-[0_6px_18px_rgba(68,47,27,0.035)]", {
  variants: {
    variant: {
      default: "border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-ink-soft)]",
      gold: "border-[color-mix(in_srgb,var(--color-gold)_24%,white)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]",
      success: "border-emerald-200/80 bg-emerald-50/82 text-[var(--color-success)]",
      warning: "border-amber-200/80 bg-amber-50/82 text-[var(--color-warning)]",
      danger: "border-rose-200/80 bg-rose-50/82 text-[var(--color-danger)]",
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
