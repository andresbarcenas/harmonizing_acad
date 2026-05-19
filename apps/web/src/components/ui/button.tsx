import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[1.15rem] text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-ink)] text-white shadow-[0_12px_30px_rgba(31,26,23,0.13)] hover:-translate-y-0.5 hover:bg-[#2b241f]",
        gold: "bg-[linear-gradient(135deg,var(--color-gold),var(--color-gold-deep))] text-white shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:brightness-95",
        outline:
          "border border-[var(--color-border-strong)] bg-[var(--color-surface-glass)] text-[var(--color-ink)] shadow-[0_8px_22px_rgba(80,58,32,0.045)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-gold)_38%,white)] hover:bg-[var(--color-surface-hover)]",
        ghost: "bg-transparent text-[var(--color-gold-deep)] hover:bg-[var(--color-gold-soft)]/60",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
