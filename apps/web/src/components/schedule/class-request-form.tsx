"use client";

import { ClassSessionType } from "@prisma/client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { classTypeLabel } from "@/lib/class-session-labels";
import type { AppLocale } from "@/lib/i18n/locales";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

const requestTypes = [ClassSessionType.MAKEUP, ClassSessionType.EXTRA, ClassSessionType.EVALUATION, ClassSessionType.SINGLE] as const;
const selectClassName = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";

export function ClassRequestForm({ timezone, locale = "en" }: { timezone: string; locale?: AppLocale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const isSpanish = locale === "es";
  const initialDate = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + 2);
    return value.toISOString().slice(0, 10);
  }, []);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setState(null);
    const payload = {
      type: String(formData.get("type") ?? ClassSessionType.MAKEUP),
      date: String(formData.get("date") ?? ""),
      startTimeLocal: String(formData.get("startTimeLocal") ?? ""),
      durationMin: Number(formData.get("durationMin") ?? 60),
      timezone: normalizeIanaTimezone(String(formData.get("timezone") ?? timezone)),
      studentMessage: String(formData.get("studentMessage") ?? "").trim() || undefined,
    };

    const response = await fetch("/api/classes/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setState({ kind: "error", message: result?.error ?? (isSpanish ? "No se pudo enviar la solicitud." : "Could not send the request.") });
      setPending(false);
      return;
    }

    setState({ kind: "success", message: isSpanish ? "Solicitud enviada. Tu docente la revisará pronto." : "Request sent. Your teacher will review it soon." });
    setPending(false);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="single-request-type" className="text-sm font-semibold text-[var(--color-ink-soft)]">{isSpanish ? "Tipo de solicitud" : "Request type"}</label>
          <select id="single-request-type" name="type" defaultValue={ClassSessionType.MAKEUP} className={selectClassName}>
            {requestTypes.map((type) => <option key={type} value={type}>{classTypeLabel(type, locale)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="single-request-timezone" className="text-sm font-semibold text-[var(--color-ink-soft)]">{isSpanish ? "Zona horaria" : "Timezone"}</label>
          <Input id="single-request-timezone" name="timezone" defaultValue={normalizeIanaTimezone(timezone)} required />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="single-request-date" className="text-sm font-semibold text-[var(--color-ink-soft)]">{isSpanish ? "Fecha preferida" : "Preferred date"}</label>
          <Input id="single-request-date" name="date" type="date" defaultValue={initialDate} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="single-request-time" className="text-sm font-semibold text-[var(--color-ink-soft)]">{isSpanish ? "Hora preferida" : "Preferred time"}</label>
          <Input id="single-request-time" name="startTimeLocal" type="time" defaultValue="17:00" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="single-request-duration" className="text-sm font-semibold text-[var(--color-ink-soft)]">{isSpanish ? "Duración" : "Duration"}</label>
          <Input id="single-request-duration" name="durationMin" type="number" min={15} max={180} defaultValue={60} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="single-request-message" className="text-sm font-semibold text-[var(--color-ink-soft)]">{isSpanish ? "Motivo o nota" : "Reason or note"}</label>
        <Textarea id="single-request-message" name="studentMessage" rows={3} placeholder={isSpanish ? "Ej: necesito recuperar una clase o preparar una audición." : "Example: I need a makeup class or audition prep."} />
      </div>
      <Button type="submit" variant="gold" disabled={pending}>{pending ? (isSpanish ? "Enviando..." : "Sending...") : isSpanish ? "Solicitar clase" : "Request class"}</Button>
      {state ? <p className={`text-sm ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}
