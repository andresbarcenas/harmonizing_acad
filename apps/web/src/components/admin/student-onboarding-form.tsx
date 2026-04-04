"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  specialty: string;
};

type CreatedStudentSummary = {
  name: string;
  email: string;
  teacherName: string;
  planName: string;
  planLabel: string;
};

export function StudentOnboardingForm({
  teachers,
}: {
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStudentSummary | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setCreated(null);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
      teacherId: String(formData.get("teacherId") ?? ""),
      timezone: String(formData.get("timezone") ?? "America/New_York").trim(),
      profileImage: String(formData.get("profileImage") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      preferredInstrument: String(formData.get("preferredInstrument") ?? "").trim() || undefined,
      bio: String(formData.get("bio") ?? "").trim() || undefined,
    };

    const response = await fetch("/api/admin/students", {
      method: "POST",
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
        setError(firstFieldError ?? data.error.formErrors?.[0] ?? "No se pudo crear el estudiante.");
      } else {
        setError("No se pudo crear el estudiante.");
      }
      setPending(false);
      return;
    }

    const data = (await response.json()) as { student: CreatedStudentSummary };
    setCreated(data.student);
    setPending(false);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Nombre completo
          </label>
          <Input id="name" name="name" placeholder="Camila Herrera" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Correo electrónico
          </label>
          <Input id="email" name="email" type="email" placeholder="camila@email.com" required />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="temporaryPassword" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Contraseña temporal
          </label>
          <Input
            id="temporaryPassword"
            name="temporaryPassword"
            type="password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />
          <p className="text-xs text-[var(--color-ink-soft)]">Debe incluir letras y números.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="teacherId" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Docente asignado
          </label>
          <select
            id="teacherId"
            name="teacherId"
            required
            defaultValue={teachers[0]?.id}
            className="h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]"
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} · {teacher.specialty}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Zona horaria
          </label>
          <Input id="timezone" name="timezone" list="timezone-options" defaultValue="America/New_York" required />
          <datalist id="timezone-options">
            {commonTimezones.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Teléfono (opcional)
          </label>
          <Input id="phone" name="phone" placeholder="+1 555 123 4567" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="preferredInstrument" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Instrumento preferido (opcional)
          </label>
          <Input id="preferredInstrument" name="preferredInstrument" placeholder="Piano o Técnica vocal" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profileImage" className="text-sm font-semibold text-[var(--color-ink-soft)]">
          Foto de perfil (opcional)
        </label>
        <Input id="profileImage" name="profileImage" placeholder="https://... o /demo/student.svg" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-semibold text-[var(--color-ink-soft)]">
          Nota inicial (opcional)
        </label>
        <Textarea id="bio" name="bio" rows={3} placeholder="Objetivo principal o contexto del estudiante." />
      </div>

      <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-white/72 px-4 py-3 text-sm text-[var(--color-ink-soft)]">
        Al crear el estudiante se activa automáticamente el plan <span className="font-semibold text-[var(--color-ink)]">$90 USD / 4 clases</span>.
      </div>

      <Button type="submit" variant="gold" disabled={pending || !teachers.length} className="w-full sm:w-auto">
        {pending ? "Creando estudiante..." : "Crear estudiante"}
      </Button>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {created ? (
        <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">Estudiante creado correctamente.</p>
          <p className="mt-1">
            {created.name} ({created.email}) · Docente: {created.teacherName}
          </p>
          <p className="mt-1">
            Plan activo: {created.planName} ({created.planLabel})
          </p>
        </div>
      ) : null}
    </form>
  );
}
