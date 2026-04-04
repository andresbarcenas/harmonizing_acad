"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileImageForm({
  initialImage,
  userName,
}: {
  initialImage?: string | null;
  userName: string;
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(initialImage ?? "");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveImage() {
    setPending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/viewer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageUrl.trim() || null }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } }
        | null;

      if (typeof data?.error === "string") {
        setError(data.error);
      } else if (data?.error && typeof data.error === "object") {
        const firstFieldError = Object.values(data.error.fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
        setError(firstFieldError ?? data.error.formErrors?.[0] ?? "No se pudo actualizar la foto.");
      } else {
        setError("No se pudo actualizar la foto.");
      }
      setPending(false);
      return;
    }

    setSuccess("Foto de perfil actualizada.");
    setPending(false);
    router.refresh();
  }

  async function uploadImage(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("Selecciona una imagen para subir.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const payload = new FormData();
    payload.append("file", file);

    const response = await fetch("/api/viewer/profile", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "No se pudo subir la imagen.");
      setUploading(false);
      return;
    }

    const data = (await response.json()) as { image?: string | null };
    setImageUrl(data.image ?? "");
    setSuccess("Imagen subida y aplicada al perfil.");
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Avatar
          src={imageUrl.trim() || undefined}
          alt={userName}
          fallback={userName.slice(0, 1).toUpperCase()}
          className="h-16 w-16 text-base"
        />
        <div className="flex-1 space-y-2">
          <label htmlFor="profile-image-url" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            URL de foto de perfil
          </label>
          <Input
            id="profile-image-url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://... o /demo/student.svg"
          />
          <p className="text-xs text-[var(--color-ink-soft)]">Acepta enlaces `https://` o rutas locales como `/demo/student.svg`.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="gold" size="sm" onClick={saveImage} disabled={pending}>
          {pending ? "Guardando..." : "Guardar foto"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImageUrl("")}
          disabled={pending}
        >
          Quitar foto
        </Button>
      </div>

      <form action={uploadImage} className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/60 p-3">
        <label htmlFor="profile-image-file" className="text-xs font-semibold tracking-[0.08em] text-[var(--color-ink-soft)] uppercase">
          Subir imagen
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input id="profile-image-file" name="file" type="file" accept="image/*" className="h-auto py-2" />
          <Button type="submit" variant="outline" size="sm" disabled={uploading}>
            {uploading ? "Subiendo..." : "Subir"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">JPG, PNG o WEBP hasta 5MB.</p>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
    </div>
  );
}
