"use client";

import { RecurringTimezoneMode } from "@prisma/client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { TimezoneAnchorSelector } from "@/components/schedule/timezone-anchor-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import type { AppLocale } from "@/lib/i18n/locales";

export function DirectRescheduleForm({
  classId,
  defaultDate,
  defaultStartTimeLocal,
  defaultDurationMin,
  teacherTimezone,
  studentTimezone,
  locale = "en",
}: {
  classId: string;
  defaultDate: string;
  defaultStartTimeLocal: string;
  defaultDurationMin: number;
  teacherTimezone: string;
  studentTimezone: string;
  locale?: AppLocale;
}) {
  const router = useRouter();
  const isSpanish = locale === "es";
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [timezoneMode, setTimezoneMode] = useState<RecurringTimezoneMode>(RecurringTimezoneMode.TEACHER_TIME);
  const [customTimezone, setCustomTimezone] = useState(teacherTimezone);
  const normalizedTeacherTimezone = normalizeIanaTimezone(teacherTimezone);
  const normalizedStudentTimezone = normalizeIanaTimezone(studentTimezone);
  const anchorTimezone = timezoneMode === RecurringTimezoneMode.STUDENT_TIME ? normalizedStudentTimezone : normalizedTeacherTimezone;

  async function onSubmit(formData: FormData) {
    setPending(true);
    setState(null);

    const response = await fetch(`/api/teacher/classes/${classId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: String(formData.get("date") ?? ""),
        startTimeLocal: String(formData.get("startTimeLocal") ?? ""),
        durationMin: Number(formData.get("durationMin") ?? defaultDurationMin),
        timezoneMode,
        teacherResponse: String(formData.get("teacherResponse") ?? "").trim() || undefined,
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string; sessionId?: string } | null;

    if (!response.ok) {
      setState({ kind: "error", message: result?.error ?? (isSpanish ? "No se pudo reagendar la clase." : "Could not reschedule the class.") });
      setPending(false);
      return;
    }

    setState({ kind: "success", message: isSpanish ? "Clase reagendada." : "Class rescheduled." });
    setPending(false);
    router.push(`/classes/${result?.sessionId ?? classId}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={isSpanish ? "Nueva fecha" : "New date"} htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
        </Field>
        <Field label={isSpanish ? "Nueva hora" : "New time"} htmlFor="startTimeLocal">
          <Input id="startTimeLocal" name="startTimeLocal" type="time" defaultValue={defaultStartTimeLocal} required />
        </Field>
        <Field label={isSpanish ? "Duración" : "Duration"} htmlFor="durationMin">
          <Input id="durationMin" name="durationMin" type="number" min={15} max={180} defaultValue={defaultDurationMin} required />
        </Field>
      </div>

      <TimezoneAnchorSelector
        anchorTimezone={anchorTimezone}
        customTimezone={customTimezone}
        idPrefix="teacher-direct-reschedule"
        locale={locale}
        mode={timezoneMode}
        onCustomTimezoneChange={setCustomTimezone}
        onModeChange={setTimezoneMode}
        role="teacher"
        studentTimezone={normalizedStudentTimezone}
        teacherTimezone={normalizedTeacherTimezone}
      />

      <Field label={isSpanish ? "Respuesta visible" : "Visible response"} htmlFor="teacherResponse">
        <Textarea
          id="teacherResponse"
          name="teacherResponse"
          rows={3}
          placeholder={isSpanish ? "Ej: Confirmé este nuevo horario para la clase." : "Example: I confirmed this new time for the class."}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? (isSpanish ? "Reagendando..." : "Rescheduling...") : (isSpanish ? "Confirmar nuevo horario" : "Confirm new time")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          {isSpanish ? "Cancelar" : "Cancel"}
        </Button>
      </div>
      {state ? <p className={`text-sm ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--color-ink-soft)]">{label}</label>
      {children}
    </div>
  );
}
