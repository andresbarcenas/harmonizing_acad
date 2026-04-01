"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function VideoUploadForm() {
  const [status, setStatus] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setStatus("");

    const response = await fetch("/api/videos", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setStatus("No pudimos subir el video. Inténtalo de nuevo.");
      setPending(false);
      return;
    }

    setStatus("Video enviado correctamente. Tu profesora lo revisará pronto.");
    setPending(false);
  }

  return (
    <form action={onSubmit} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
      <p className="text-sm font-semibold">Subir mi práctica semanal (1–3 min)</p>
      <input
        type="file"
        name="file"
        accept="video/mp4,video/quicktime,video/webm"
        required
        className="block w-full text-sm text-[var(--color-ink-soft)] file:mr-3 file:rounded-lg file:border file:border-[var(--color-border)] file:bg-[var(--color-muted)] file:px-3 file:py-2"
      />
      <input type="hidden" name="durationSec" value="120" />
      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Subiendo..." : "Upload my weekly practice"}
      </Button>
      {status ? <p className="text-sm text-[var(--color-ink-soft)]">{status}</p> : null}
    </form>
  );
}
