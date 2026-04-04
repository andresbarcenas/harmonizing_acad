"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const commonTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Puerto_Rico",
];

export function TeacherEditForm({
  teacherId,
  initial,
}: {
  teacherId: string;
  initial: {
    name: string;
    email: string;
    specialty: string;
    timezone: string;
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

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      specialty: String(formData.get("specialty") ?? "").trim(),
      timezone: String(formData.get("timezone") ?? "America/New_York").trim(),
      bio: String(formData.get("bio") ?? "").trim() || undefined,
      zoomLink: String(formData.get("zoomLink") ?? "").trim() || undefined,
      meetLink: String(formData.get("meetLink") ?? "").trim() || undefined,
      profileImage: String(formData.get("profileImage") ?? "").trim() || undefined,
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

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? "Cerrar edición" : "Editar"}
      </Button>

      {open ? (
        <form action={onSubmit} className="mt-3 space-y-3 rounded-[1rem] border border-[var(--color-border)] bg-white/82 p-3">
          <div className="flex items-center gap-2">
            <Avatar
              src={initial.profileImage}
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
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="specialty" defaultValue={initial.specialty} required />
            <Input name="timezone" list="teacher-edit-timezones" defaultValue={initial.timezone} required />
            <datalist id="teacher-edit-timezones">
              {commonTimezones.map((timezone) => (
                <option key={timezone} value={timezone} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="zoomLink" type="url" defaultValue={initial.zoomLink ?? ""} placeholder="Zoom URL" />
            <Input name="meetLink" type="url" defaultValue={initial.meetLink ?? ""} placeholder="Google Meet URL" />
          </div>
          <Input name="profileImage" defaultValue={initial.profileImage ?? ""} placeholder="URL foto de perfil" />
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
