"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";

export function VideoReviewForm({ videoId, disabled = false, locale = "en" }: { videoId: string; disabled?: boolean; locale?: AppLocale }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage("");

    const response = await fetch("/api/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, comment }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? (locale === "es" ? "No se pudo enviar feedback." : "Could not send feedback."));
      setPending(false);
      return;
    }

    setMessage(locale === "es" ? "Feedback guardado correctamente." : "Feedback saved.");
    setComment("");
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={disabled ? (locale === "es" ? "Este video ya fue revisado." : "This video has already been reviewed.") : locale === "es" ? "Escribe feedback personalizado" : "Write personalized feedback"}
        disabled={disabled}
      />
      <Button onClick={submit} variant="gold" disabled={disabled || pending || comment.trim().length < 3} className="w-full sm:w-auto">
        {pending ? (locale === "es" ? "Guardando..." : "Saving...") : locale === "es" ? "Marcar como revisado" : "Mark as reviewed"}
      </Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  );
}
