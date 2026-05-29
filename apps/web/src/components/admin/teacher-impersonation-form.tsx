"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type ApiError = { error?: string } | null;

export function TeacherImpersonationForm({ teacherUserId, teacherName, locale = "en" }: { teacherUserId: string; teacherName: string; locale?: AppLocale }) {
  const dictionary = getDictionary(locale);
  const isSpanish = locale === "es";
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/impersonation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: teacherUserId, reason }),
    });
    const data = (await response.json().catch(() => null)) as (ApiError & { redirectTo?: string }) | null;

    if (!response.ok) {
      setError(data?.error ?? (isSpanish ? "No se pudo iniciar la suplantación." : "Could not start impersonation."));
      setPending(false);
      return;
    }

    window.location.href = data?.redirectTo ?? "/teacher/dashboard";
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-[1.1rem] border border-amber-200/70 bg-amber-50/55 p-3">
      <label className="space-y-1 text-left">
        <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--color-gold-deep)] uppercase">
          {isSpanish ? "Razón de soporte" : "Support reason"}
        </span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={isSpanish ? `Ej. revisar agenda de ${teacherName}` : `Example: troubleshoot ${teacherName}'s schedule`}
          className="h-[2.6rem] w-full rounded-[0.9rem] border border-[var(--color-border-strong)] bg-white/88 px-3 text-xs text-[var(--color-ink)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none"
          required
          minLength={3}
          maxLength={500}
        />
      </label>
      <Button type="submit" variant="outline" disabled={pending || reason.trim().length < 3} className="justify-center whitespace-nowrap">
        {pending ? dictionary.common.saving : (isSpanish ? "Ver como docente" : "View as teacher")}
      </Button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </form>
  );
}
