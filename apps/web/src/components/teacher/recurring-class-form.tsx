"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type StudentOption = {
  id: string;
  name: string;
  instrument?: string | null;
};

const commonTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Puerto_Rico",
];

export function RecurringClassForm({
  students,
  defaultTimezone,
  defaultMeetingUrl,
}: {
  students: StudentOption[];
  defaultTimezone: string;
  defaultMeetingUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const initialDate = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return value.toISOString().slice(0, 10);
  }, []);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);
    setConflicts([]);

    const payload = {
      studentId: String(formData.get("studentId") ?? ""),
      startsOnDate: String(formData.get("startsOnDate") ?? ""),
      startTimeLocal: String(formData.get("startTimeLocal") ?? ""),
      timezone: String(formData.get("timezone") ?? defaultTimezone),
      durationMin: Number(formData.get("durationMin") ?? 60),
      occurrences: Number(formData.get("occurrences") ?? 8),
      intervalWeeks: Number(formData.get("intervalWeeks") ?? 1),
      meetingUrl: String(formData.get("meetingUrl") ?? "").trim(),
      lessonFocus: String(formData.get("lessonFocus") ?? "").trim() || undefined,
    };

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; created?: number; conflicts?: string[] }
      | null;

    if (!response.ok) {
      setError(data?.error ?? "No se pudieron crear las clases.");
      setConflicts(data?.conflicts ?? []);
      setPending(false);
      return;
    }

    const created = data?.created ?? 0;
    const conflictCount = data?.conflicts?.length ?? 0;
    if (conflictCount) {
      setSuccess(`Se crearon ${created} clases. ${conflictCount} bloque(s) tuvieron conflicto.`);
      setConflicts(data?.conflicts ?? []);
    } else {
      setSuccess(`Se crearon ${created} clases recurrentes.`);
    }

    setPending(false);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="studentId" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Estudiante
          </label>
          <select
            id="studentId"
            name="studentId"
            defaultValue={students[0]?.id}
            className="h-[3.1rem] w-full rounded-[1.1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]"
            required
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} {student.instrument ? `· ${student.instrument}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="meetingUrl" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Link de clase
          </label>
          <Input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            defaultValue={defaultMeetingUrl ?? ""}
            placeholder="https://zoom.us/j/..."
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="startsOnDate" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Fecha inicial
          </label>
          <Input id="startsOnDate" name="startsOnDate" type="date" defaultValue={initialDate} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="startTimeLocal" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Hora local
          </label>
          <Input id="startTimeLocal" name="startTimeLocal" type="time" defaultValue="18:00" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Zona horaria
          </label>
          <Input id="timezone" name="timezone" list="recurring-timezones" defaultValue={defaultTimezone} required />
          <datalist id="recurring-timezones">
            {commonTimezones.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="durationMin" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Duración (min)
          </label>
          <Input id="durationMin" name="durationMin" type="number" min={30} max={180} defaultValue={60} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="occurrences" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Repeticiones
          </label>
          <Input id="occurrences" name="occurrences" type="number" min={1} max={24} defaultValue={8} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="intervalWeeks" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            Cada (semanas)
          </label>
          <Input id="intervalWeeks" name="intervalWeeks" type="number" min={1} max={4} defaultValue={1} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lessonFocus" className="text-sm font-semibold text-[var(--color-ink-soft)]">
          Enfoque (opcional)
        </label>
        <Textarea id="lessonFocus" name="lessonFocus" rows={2} placeholder="Ej: Técnica vocal, control respiratorio y afinación." />
      </div>

      <Button type="submit" variant="gold" size="sm" disabled={pending || !students.length}>
        {pending ? "Programando..." : "Programar clases recurrentes"}
      </Button>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {conflicts.length ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white/72 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
          <p className="font-semibold text-[var(--color-ink)]">Bloques con conflicto:</p>
          <ul className="mt-1 space-y-1">
            {conflicts.slice(0, 6).map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
