import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full rounded-[1.2rem] control-surface px-4 py-3 text-sm placeholder:text-[var(--color-ink-muted)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,var(--color-border))] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
