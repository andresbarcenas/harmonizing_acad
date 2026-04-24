import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[1.2rem] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-gold)_45%,white)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-ink)] text-white shadow-[0_10px_28px_rgba(31,26,23,0.12)] hover:-translate-y-0.5 hover:opacity-95",
        gold: "bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:bg-[var(--color-gold-deep)]",
        outline:
          "border border-[var(--color-border-strong)] bg-white/74 text-[var(--color-ink)] shadow-[0_8px_22px_rgba(80,58,32,0.05)] hover:border-[color-mix(in_srgb,var(--color-gold)_40%,white)] hover:bg-[var(--color-gold-soft)]/55",
        ghost: "bg-transparent text-[var(--color-gold-deep)] hover:bg-[var(--color-gold-soft)]/55",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-14 px-7 text-base",
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
