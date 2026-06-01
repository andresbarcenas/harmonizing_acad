"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

export function ExamPublishButton({ assessmentId, published, locale, size = "sm" }: { assessmentId: string; published: boolean; locale: AppLocale; size?: "sm" | "default" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const isSpanish = locale === "es";
  const action = published ? "unpublish" : "publish";

  async function submit() {
    setMessage("");
    const confirmed = window.confirm(
      published
        ? isSpanish
          ? "¿Ocultar esta evaluación para estudiante y acudientes?"
          : "Hide this assessment from the student and guardians?"
        : isSpanish
          ? "¿Publicar esta evaluación para estudiante y acudientes?"
          : "Publish this assessment for the student and guardians?",
    );
    if (!confirmed) return;

    const response = await fetch(`/api/progress/exam-assessments/${assessmentId}/${action}`, { method: "POST" });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? (isSpanish ? "No se pudo actualizar la publicación." : "Could not update publication."));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" size={size} variant={published ? "outline" : "gold"} disabled={pending} onClick={submit}>
        {published ? (isSpanish ? "Despublicar" : "Unpublish") : (isSpanish ? "Publicar a familia" : "Publish to family")}
      </Button>
      {message ? <span className="text-xs text-[var(--color-danger)]">{message}</span> : null}
    </span>
  );
}
