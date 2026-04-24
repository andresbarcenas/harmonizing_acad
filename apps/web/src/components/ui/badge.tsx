import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-[var(--color-border)] bg-white/72 text-[var(--color-ink-soft)]",
      gold: "border-[color-mix(in_srgb,var(--color-gold)_24%,white)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]",
      success: "border-emerald-200 bg-emerald-50 text-[var(--color-success)]",
      warning: "border-amber-200 bg-amber-50 text-[var(--color-warning)]",
      danger: "border-rose-200 bg-rose-50 text-[var(--color-danger)]",
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
