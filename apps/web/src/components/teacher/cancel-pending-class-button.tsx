"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

export function CancelPendingClassButton({
  classId,
  locale = "en",
  redirectHref,
  size = "sm",
}: {
  classId: string;
  locale?: AppLocale;
  redirectHref?: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const isSpanish = locale === "es";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelClass() {
    const confirmed = window.confirm(
      isSpanish
        ? "¿Cancelar clase? Esto cancelará la clase pendiente y cerrará cualquier solicitud de reagenda."
        : "Cancel class? This will cancel the pending class and close any reschedule request.",
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);

    const response = await fetch(`/api/teacher/classes/${classId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const result = (await response.json().catch(() => null)) as { error?: string; sessionId?: string } | null;

    if (!response.ok) {
      setError(result?.error ?? (isSpanish ? "No se pudo cancelar la clase." : "Could not cancel the class."));
      setPending(false);
      return;
    }

    setPending(false);
    if (redirectHref) {
      router.push(redirectHref.replace("[classId]", result?.sessionId ?? classId));
    }
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={pending}
        onClick={() => void cancelClass()}
        className="border-rose-200/80 bg-rose-50/70 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
      >
        {pending ? (isSpanish ? "Cancelando..." : "Cancelling...") : (isSpanish ? "Cancelar clase" : "Cancel class")}
      </Button>
      {error ? <p className="max-w-[14rem] text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
