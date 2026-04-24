"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
type FileValidationResult = { valid: true } | { valid: false; message: string };

export function VideoUploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
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

  function validateFile(file: File | null): FileValidationResult {
    if (!file) {
      return { valid: false, message: "Selecciona un archivo antes de continuar." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, message: "Formato no permitido. Usa MP4, MOV o WEBM." };
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return { valid: false, message: "El archivo supera el límite de 100MB." };
    }
    return { valid: true };
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
    const validation = validateFile(activeFile);
    if (!validation.valid) {
      setStatus({ kind: "error", message: validation.message });
      return;
    }

    setPending(true);
    setUploadProgress(0);
    setStatus(null);

    const formData = new FormData();
    formData.set("file", activeFile as File);
    formData.set("durationSec", `${Math.max(recordedSeconds, 60)}`);

    let response: Response;
    try {
      response = await uploadWithProgress(formData, (progress) => setUploadProgress(progress));
    } catch {
      setStatus({ kind: "error", message: "No pudimos subir el video. Revisa tu conexión e inténtalo otra vez." });
      setPending(false);
      return;
    }

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
    setUploadProgress(100);
    router.refresh();
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
          const validation = validateFile(file);
          if (!validation.valid) {
            setStatus({ kind: "error", message: validation.message });
            setSelectedFile(null);
            return;
          }
          setStatus(null);
          setSelectedFile(file);
        }}
        className="block w-full rounded-[1.2rem] border border-[var(--color-border)] bg-white/76 p-4 text-sm text-[var(--color-ink-soft)] file:mr-3 file:rounded-full file:border file:border-[var(--color-border)] file:bg-[var(--color-gold-soft)] file:px-4 file:py-2 file:font-semibold file:text-[var(--color-gold-deep)]"
      />
      <div
        className={`rounded-[1.2rem] border border-dashed p-4 text-sm transition ${isDragging ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)]" : "border-[var(--color-border)] bg-white/72"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0] ?? null;
          const validation = validateFile(file);
          if (!validation.valid) {
            setStatus({ kind: "error", message: validation.message });
            return;
          }
          setStatus(null);
          setSelectedFile(file);
        }}
      >
        {selectedFile ? (
          <p className="text-[var(--color-ink-soft)]">
            Archivo listo: <span className="font-semibold text-[var(--color-ink)]">{selectedFile.name}</span>
          </p>
        ) : (
          <p className="text-[var(--color-ink-soft)]">Arrastra y suelta tu archivo MP4/MOV aquí o usa el selector.</p>
        )}
      </div>
      {pending ? (
        <div className="space-y-1">
          <p className="text-xs text-[var(--color-ink-soft)]">Subiendo... {uploadProgress}%</p>
          <div className="h-2 rounded-full bg-[var(--color-gold-soft)]">
            <div className="h-2 rounded-full bg-[var(--color-gold)] transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      ) : null}
      <Button type="submit" variant="gold" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Subiendo..." : "Subir mi práctica semanal"}
      </Button>
      {status ? (
        <p className={`text-sm ${status.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>
      ) : null}
    </form>
  );
}

function uploadWithProgress(formData: FormData, onProgress: (value: number) => void) {
  return new Promise<Response>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/videos");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("UPLOAD_FAILED"));
    request.onload = () => {
      onProgress(100);
      resolve(
        new Response(request.responseText, {
          status: request.status,
          headers: { "Content-Type": request.getResponseHeader("content-type") || "application/json" },
        }),
      );
    };
    request.send(formData);
  });
}
