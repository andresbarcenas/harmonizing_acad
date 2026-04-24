"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function VideoUploadForm() {
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(120);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const supportsRecording = useMemo(
    () => typeof window !== "undefined" && "MediaRecorder" in window && "mediaDevices" in navigator,
    [],
  );

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedUrl]);

  function resetRecordedPreview() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedFile(null);
  }

  async function startRecording() {
    try {
      resetRecordedPreview();
      setStatus(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setRecordedSeconds(0);

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], `practica-${Date.now()}.webm`, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedFile(file);
        setRecordedUrl(url);
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordedSeconds((current) => current + 1);
      }, 1000);
    } catch {
      setStatus({ kind: "error", message: "No pudimos acceder a tu cámara/micrófono." });
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeFile = recordedFile ?? selectedFile;
    if (!activeFile) {
      setStatus({ kind: "error", message: "Selecciona o graba un video antes de subirlo." });
      return;
    }

    setPending(true);
    setStatus(null);

    const formData = new FormData();
    formData.set("file", activeFile);
    formData.set("durationSec", `${Math.max(recordedSeconds, 60)}`);

    const response = await fetch("/api/videos", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: payload?.error ?? "No pudimos subir el video. Inténtalo de nuevo." });
      setPending(false);
      return;
    }

    setStatus({ kind: "success", message: "Video enviado correctamente. Tu profesora lo revisará pronto." });
    setSelectedFile(null);
    resetRecordedPreview();
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-paper-elevated)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">Entrega semanal</p>
      <p className="font-display text-[1.8rem] tracking-[-0.04em] text-[var(--color-ink)] sm:text-3xl">Subir mi práctica</p>
      <p className="text-sm text-[var(--color-ink-soft)]">Comparte un video de 1 a 3 minutos para recibir observaciones personalizadas.</p>
      {supportsRecording ? (
        <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-white/74 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">Grabar aquí</p>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Puedes grabar desde el navegador o subir un archivo.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!recording ? (
              <Button type="button" variant="gold" onClick={startRecording} disabled={pending} className="w-full sm:w-auto">
                Iniciar grabación
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={stopRecording} disabled={pending} className="w-full sm:w-auto">
                Detener ({recordedSeconds}s)
              </Button>
            )}
            {recordedFile ? (
              <Button type="button" variant="ghost" onClick={resetRecordedPreview} disabled={pending} className="w-full sm:w-auto">
                Limpiar grabación
              </Button>
            ) : null}
          </div>
          {recordedUrl ? (
            <video controls className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-black/90" src={recordedUrl}>
              <track kind="captions" />
            </video>
          ) : null}
        </div>
      ) : null}
      <input
        type="file"
        name="file"
        accept="video/mp4,video/quicktime,video/webm"
        required={!recordedFile}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setSelectedFile(file);
        }}
        className="block w-full rounded-[1.2rem] border border-[var(--color-border)] bg-white/76 p-4 text-sm text-[var(--color-ink-soft)] file:mr-3 file:rounded-full file:border file:border-[var(--color-border)] file:bg-[var(--color-gold-soft)] file:px-4 file:py-2 file:font-semibold file:text-[var(--color-gold-deep)]"
      />
      <Button type="submit" variant="gold" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Subiendo..." : "Subir mi práctica semanal"}
      </Button>
      {status ? (
        <p className={`text-sm ${status.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>
      ) : null}
    </form>
  );
}
