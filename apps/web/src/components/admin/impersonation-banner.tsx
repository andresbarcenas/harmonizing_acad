"use client";

import { ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImpersonationBannerProps = {
  targetName: string;
  adminName: string;
  expiresAt: string;
  locale: "en" | "es";
};

function formatExpiry(value: string, locale: "en" | "es") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ImpersonationBanner({ targetName, adminName, expiresAt, locale }: ImpersonationBannerProps) {
  const [pending, setPending] = useState(false);
  const isSpanish = locale === "es";

  async function stopImpersonation() {
    setPending(true);
    const response = await fetch("/api/admin/impersonation/stop", { method: "POST" });
    const data = (await response.json().catch(() => null)) as { redirectTo?: string } | null;
    window.location.href = response.ok ? data?.redirectTo ?? "/admin/access" : "/admin/access";
  }

  return (
    <section
      className={cn(
        "mb-4 rounded-[var(--radius-3xl)] border border-amber-300/70 bg-[linear-gradient(135deg,#3a2614,#7a4a18)] px-4 py-3 text-white shadow-[0_18px_45px_rgba(74,44,16,0.22)]",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-amber-100 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[0.02em]">
              {isSpanish ? `Estás viendo como ${targetName}` : `You are viewing as ${targetName}`}
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-50/82">
              {isSpanish
                ? `Admin original: ${adminName}. Esta sesión de soporte vence a las ${formatExpiry(expiresAt, locale)}.`
                : `Original admin: ${adminName}. This support session expires at ${formatExpiry(expiresAt, locale)}.`}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={stopImpersonation} disabled={pending} className="border-white/24 bg-white/92 text-[#4a2b13] hover:bg-white">
          {pending ? (isSpanish ? "Saliendo..." : "Exiting...") : (isSpanish ? "Salir de suplantación" : "Exit impersonation")}
        </Button>
      </div>
    </section>
  );
}
