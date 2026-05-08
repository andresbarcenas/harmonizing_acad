"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";

export function VideoReviewForm({
  videoId,
  disabled = false,
  locale = "en",
  skillCategories = [],
}: {
  videoId: string;
  disabled?: boolean;
  locale?: AppLocale;
  skillCategories?: Array<{ id: string; name: string; instrument: string }>;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage("");

    const skillRatings = [0, 1, 2]
      .map((index) => {
        const skillCategoryId = (document.querySelector<HTMLSelectElement>(`[data-video-skill='${videoId}-${index}']`)?.value ?? "").trim();
        const rating = Number(document.querySelector<HTMLInputElement>(`[data-video-rating='${videoId}-${index}']`)?.value ?? 0);
        return skillCategoryId && rating >= 1 ? { skillCategoryId, rating } : null;
      })
      .filter((item): item is { skillCategoryId: string; rating: number } => Boolean(item));

    const response = await fetch("/api/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, comment, skillRatings }),
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
      {skillCategories.length && !disabled ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-2">
              <select data-video-skill={`${videoId}-${index}`} className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2 py-2 text-xs">
                <option value="">{locale === "es" ? "Habilidad" : "Skill"}</option>
                {skillCategories.map((skill) => (
                  <option key={skill.id} value={skill.id}>{skill.instrument} · {skill.name}</option>
                ))}
              </select>
              <input data-video-rating={`${videoId}-${index}`} type="number" min={1} max={5} placeholder="1-5" className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-white px-2 py-2 text-xs" />
            </div>
          ))}
        </div>
      ) : null}
      <Button onClick={submit} variant="gold" disabled={disabled || pending || comment.trim().length < 3} className="w-full sm:w-auto">
        {pending ? (locale === "es" ? "Guardando..." : "Saving...") : locale === "es" ? "Marcar como revisado" : "Mark as reviewed"}
      </Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  );
}
