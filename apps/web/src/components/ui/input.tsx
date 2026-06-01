import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-[3.35rem] w-full rounded-[1.2rem] control-surface px-4 text-sm placeholder:text-[var(--color-ink-muted)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,var(--color-border))] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
