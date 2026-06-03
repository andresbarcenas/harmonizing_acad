import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormattedNoteText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {children}
    </p>
  );
}
