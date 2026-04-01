"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function VideoReviewForm({ videoId }: { videoId: string }) {
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
      setMessage("No se pudo enviar feedback");
      setPending(false);
      return;
    }

    setMessage("Feedback enviado");
    setComment("");
    setPending(false);
  }

  return (
    <div className="space-y-2">
      <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escribe feedback personalizado" />
      <Button onClick={submit} variant="outline" disabled={pending || comment.trim().length < 3}>
        {pending ? "Guardando..." : "Marcar como revisado"}
      </Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  );
}
