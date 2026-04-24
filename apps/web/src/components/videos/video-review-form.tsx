"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function VideoReviewForm({ videoId, disabled = false }: { videoId: string; disabled?: boolean }) {
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
      setMessage(payload?.error ?? "No se pudo enviar feedback.");
      setPending(false);
      return;
    }

    setMessage("Feedback guardado correctamente.");
    setComment("");
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={disabled ? "Este video ya fue revisado." : "Escribe feedback personalizado"}
        disabled={disabled}
      />
      <Button onClick={submit} variant="gold" disabled={disabled || pending || comment.trim().length < 3} className="w-full sm:w-auto">
        {pending ? "Guardando..." : "Marcar como revisado"}
      </Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  );
}
