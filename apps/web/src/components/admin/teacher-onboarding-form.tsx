"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const commonTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Puerto_Rico",
];

type AvailabilityDraft = {
  id: string;
  weekday: number;
  start: string;
  end: string;
  timezone: string;
};

type CreatedTeacherSummary = {
  name: string;
  email: string;
  specialty: string;
  timezone: string;
  availabilityCount: number;
};

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function makeRow(seed: number, timezone: string): AvailabilityDraft {
  return {
    id: `slot-${seed}`,
    weekday: 1,
    start: "17:00",
    end: "18:00",
    timezone,
  };
}

export function TeacherOnboardingForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedTeacherSummary | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDraft[]>([]);

  function addAvailabilityRow(timezone: string) {
    setAvailability((previous) => [...previous, makeRow(Date.now(), timezone)]);
  }

  function removeAvailabilityRow(id: string) {
    setAvailability((previous) => previous.filter((row) => row.id !== id));
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setCreated(null);

    const timezone = String(formData.get("timezone") ?? "America/New_York").trim();

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
      specialty: String(formData.get("specialty") ?? "").trim(),
      timezone,
      profileImage: String(formData.get("profileImage") ?? "").trim() || undefined,
      bio: String(formData.get("bio") ?? "").trim() || undefined,
      zoomLink: String(formData.get("zoomLink") ?? "").trim() || undefined,
      meetLink: String(formData.get("meetLink") ?? "").trim() || undefined,
      availability: availability.map((row) => ({
        weekday: row.weekday,
        startMinuteLocal: toMinutes(row.start),
        endMinuteLocal: toMinutes(row.end),
        timezone: row.timezone || timezone,
      })),
    };

    const response = await fetch("/api/admin/teachers", {
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
        setError(firstFieldError ?? data.error.formErrors?.[0] ?? "No se pudo crear el docente.");
      } else {
        setError("No se pudo crear el docente.");
      }

      setPending(false);
      return;
    }

    const data = (await response.json()) as { teacher: CreatedTeacherSummary };
    setCreated(data.teacher);
    setPending(false);
    setAvailability([]);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Nombre completo
          </label>
          <Input id="name" name="name" placeholder="Daniela Rojas" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Correo electrónico
          </label>
          <Input id="email" name="email" type="email" placeholder="daniela@email.com" required />
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
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            required
          />
          <p className="text-xs text-[var(--color-ink-soft)]">Debe incluir letras y números.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="specialty" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Especialidad
          </label>
          <Input id="specialty" name="specialty" placeholder="Técnica vocal y piano" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Zona horaria
          </label>
          <Input id="timezone" name="timezone" list="teacher-timezone-options" defaultValue="America/New_York" required />
          <datalist id="teacher-timezone-options">
            {commonTimezones.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="zoomLink" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Zoom link (opcional)
          </label>
          <Input id="zoomLink" name="zoomLink" type="url" placeholder="https://zoom.us/j/..." />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="meetLink" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Google Meet link (opcional)
          </label>
          <Input id="meetLink" name="meetLink" type="url" placeholder="https://meet.google.com/..." />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profileImage" className="text-sm font-semibold text-[var(--color-ink-soft)]">
          Foto de perfil (opcional)
        </label>
        <Input id="profileImage" name="profileImage" placeholder="https://... o /demo/teacher.svg" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-semibold text-[var(--color-ink-soft)]">
          Bio (opcional)
        </label>
        <Textarea id="bio" name="bio" rows={3} placeholder="Perfil breve del docente y su enfoque." />
      </div>

      <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">Disponibilidad inicial (opcional)</p>
            <p className="text-xs text-[var(--color-ink-soft)]">Puedes dejarlo vacío y configurarlo luego en Disponibilidad.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addAvailabilityRow("America/New_York")}
          >
            Agregar bloque
          </Button>
        </div>

        {availability.length ? (
          <div className="mt-3 space-y-2">
            {availability.map((row) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-[1rem] border border-[var(--color-border)] bg-white/80 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <select
                  value={row.weekday}
                  onChange={(event) =>
                    setAvailability((previous) =>
                      previous.map((item) =>
                        item.id === row.id ? { ...item, weekday: Number(event.target.value) } : item,
                      ),
                    )
                  }
                  className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"
                >
                  {weekdays.map((day, index) => (
                    <option key={`${row.id}-${day}`} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
                <Input
                  type="time"
                  value={row.start}
                  onChange={(event) =>
                    setAvailability((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, start: event.target.value } : item)),
                    )
                  }
                />
                <Input
                  type="time"
                  value={row.end}
                  onChange={(event) =>
                    setAvailability((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, end: event.target.value } : item)),
                    )
                  }
                />
                <Input
                  value={row.timezone}
                  list="teacher-timezone-options"
                  onChange={(event) =>
                    setAvailability((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, timezone: event.target.value } : item)),
                    )
                  }
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeAvailabilityRow(row.id)}>
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Button type="submit" variant="gold" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Creando docente..." : "Crear docente"}
      </Button>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {created ? (
        <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">Docente creado correctamente.</p>
          <p className="mt-1">
            {created.name} ({created.email}) · {created.specialty}
          </p>
          <p className="mt-1">
            Zona horaria: {created.timezone} · Bloques creados: {created.availabilityCount}
          </p>
        </div>
      ) : null}
    </form>
  );
}
