"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Button
      size={compact ? "sm" : "default"}
      variant="outline"
      className={cn(compact ? "px-3" : "", className)}
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
    >
      {compact ? "Salir" : "Cerrar sesión"}
    </Button>
  );
}
