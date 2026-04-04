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

type TeacherOption = {
  id: string;
  name: string;
};

export function StudentEditForm({
  studentId,
  initial,
  teachers,
}: {
  studentId: string;
  initial: {
    name: string;
    email: string;
    timezone: string;
    teacherId?: string | null;
    phone?: string | null;
    preferredInstrument?: string | null;
    bio?: string | null;
    profileImage?: string | null;
  };
  teachers: TeacherOption[];
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
      timezone: String(formData.get("timezone") ?? "America/New_York").trim(),
      teacherId: String(formData.get("teacherId") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      preferredInstrument: String(formData.get("preferredInstrument") ?? "").trim() || undefined,
      bio: String(formData.get("bio") ?? "").trim() || undefined,
      profileImage: String(formData.get("profileImage") ?? "").trim() || undefined,
    };

    const response = await fetch(`/api/admin/students/${studentId}`, {
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

    setSuccess("Estudiante actualizado.");
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
            <p className="text-xs text-[var(--color-ink-soft)]">Editar datos del estudiante.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="name" defaultValue={initial.name} required />
            <Input name="email" type="email" defaultValue={initial.email} required />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="timezone" list="student-edit-timezones" defaultValue={initial.timezone} required />
            <select
              name="teacherId"
              defaultValue={initial.teacherId ?? teachers[0]?.id}
              className="h-[3.05rem] w-full rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]"
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <datalist id="student-edit-timezones">
              {commonTimezones.map((timezone) => (
                <option key={timezone} value={timezone} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="phone" defaultValue={initial.phone ?? ""} placeholder="Teléfono" />
            <Input name="preferredInstrument" defaultValue={initial.preferredInstrument ?? ""} placeholder="Instrumento preferido" />
          </div>
          <Input name="profileImage" defaultValue={initial.profileImage ?? ""} placeholder="URL foto de perfil" />
          <Textarea name="bio" rows={2} defaultValue={initial.bio ?? ""} placeholder="Bio" />
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
