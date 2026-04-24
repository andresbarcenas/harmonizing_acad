"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadProfileImageFile } from "@/lib/profile-upload";

export function TeacherEditForm({
  teacherId,
  initial,
}: {
  teacherId: string;
  initial: {
    userId: string;
    name: string;
    email: string;
    specialty: string;
    bio?: string | null;
    zoomLink?: string | null;
    meetLink?: string | null;
    profileImage?: string | null;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState(initial.profileImage ?? "");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      specialty: String(formData.get("specialty") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim() || undefined,
      zoomLink: String(formData.get("zoomLink") ?? "").trim() || undefined,
      meetLink: String(formData.get("meetLink") ?? "").trim() || undefined,
      profileImage: profileImage.trim() || undefined,
    };

    const response = await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } }
        | null;
      if (typeof data?.error === "string") {
        setError(data.error);
      } else if (data?.error && typeof data.error === "object") {
        const firstFieldError = Object.values(data.error.fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
        setError(firstFieldError ?? data.error.formErrors?.[0] ?? "No se pudo actualizar.");
      } else {
        setError("No se pudo actualizar.");
      }
      setPending(false);
      return;
    }

    setSuccess("Docente actualizado.");
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  async function uploadImage() {
    if (!uploadFile) {
      setError("Selecciona una imagen para subir.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadProfileImageFile(uploadFile, {
        targetUserId: initial.userId,
        assign: true,
      });
      setProfileImage(uploaded.imageUrl);
      setSuccess("Foto actualizada.");
      setUploadFile(null);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? "Cerrar edición" : "Editar"}
      </Button>

      {open ? (
        <form action={onSubmit} className="mt-3 space-y-3 rounded-[1rem] border border-[var(--color-border)] bg-white/82 p-3">
          <div className="flex items-center gap-2">
            <Avatar
              src={profileImage || undefined}
              alt={initial.name}
              fallback={initial.name.slice(0, 1).toUpperCase()}
              className="h-9 w-9 text-[10px]"
            />
            <p className="text-xs text-[var(--color-ink-soft)]">Editar datos del docente.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="name" defaultValue={initial.name} required />
            <Input name="email" type="email" defaultValue={initial.email} required />
          </div>
          <div className="grid gap-2 md:grid-cols-1">
            <Input name="specialty" defaultValue={initial.specialty} required />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="zoomLink" type="url" defaultValue={initial.zoomLink ?? ""} placeholder="Zoom URL" />
            <Input name="meetLink" type="url" defaultValue={initial.meetLink ?? ""} placeholder="Google Meet URL" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`teacher-edit-file-${teacherId}`}
              name="file"
              type="file"
              accept="image/*"
              className="h-auto py-2"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            />
            <Button type="button" size="sm" variant="outline" disabled={uploading || !uploadFile} onClick={uploadImage}>
              {uploading ? "Subiendo..." : "Subir foto"}
            </Button>
          </div>
          <Textarea name="bio" rows={2} defaultValue={initial.bio ?? ""} placeholder="Bio docente" />
          <Button type="submit" size="sm" variant="gold" disabled={pending}>
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
