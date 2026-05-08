"use client";

import { ClassSessionType } from "@prisma/client";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { classTypeLabel } from "@/lib/class-session-labels";
import type { AppLocale } from "@/lib/i18n/locales";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

type StudentOption = {
  id: string;
  name: string;
  instrument?: string | null;
  teacherId?: string | null;
};

type TeacherOption = {
  id: string;
  name: string;
  timezone: string;
  meetingUrl?: string | null;
};

const classTypeOptions = [
  ClassSessionType.SINGLE,
  ClassSessionType.TRIAL,
  ClassSessionType.MAKEUP,
  ClassSessionType.EXTRA,
  ClassSessionType.EVALUATION,
  ClassSessionType.REPLACEMENT,
] as const;

const teacherClassTypeOptions = [
  ClassSessionType.SINGLE,
  ClassSessionType.MAKEUP,
  ClassSessionType.EXTRA,
  ClassSessionType.EVALUATION,
] as const;

export function SingleClassBookingForm({
  role,
  students,
  teachers = [],
  defaultTimezone,
  defaultTeacherId,
  defaultMeetingUrl,
  selectedStudentId,
  locale = "en",
}: {
  role: "admin" | "teacher";
  students: StudentOption[];
  teachers?: TeacherOption[];
  defaultTimezone: string;
  defaultTeacherId?: string | null;
  defaultMeetingUrl?: string | null;
  selectedStudentId?: string | null;
  locale?: AppLocale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(defaultTeacherId ?? teachers[0]?.id ?? "");
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null;
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const normalizedTimezone = normalizeIanaTimezone(selectedTeacher?.timezone ?? defaultTimezone);
  const isSpanish = locale === "es";

  const initialDate = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return value.toISOString().slice(0, 10);
  }, []);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setState(null);

    const payload = {
      studentId: selectedStudent?.id ?? String(formData.get("studentId") ?? ""),
      teacherId: role === "admin" ? String(formData.get("teacherId") ?? "") : undefined,
      type: String(formData.get("type") ?? ClassSessionType.SINGLE),
      instrument: String(formData.get("instrument") ?? "").trim() || undefined,
      date: String(formData.get("date") ?? ""),
      startTimeLocal: String(formData.get("startTimeLocal") ?? ""),
      durationMin: Number(formData.get("durationMin") ?? 60),
      timezone: normalizeIanaTimezone(String(formData.get("timezone") ?? normalizedTimezone)),
      locationMode: String(formData.get("locationMode") ?? "ONLINE"),
      meetingUrl: String(formData.get("meetingUrl") ?? "").trim() || undefined,
      lessonFocus: String(formData.get("lessonFocus") ?? "").trim() || undefined,
      internalNote: String(formData.get("internalNote") ?? "").trim() || undefined,
      studentVisibleNote: String(formData.get("studentVisibleNote") ?? "").trim() || undefined,
    };

    const response = await fetch("/api/classes/single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as { error?: string; sessionId?: string } | null;

    if (!response.ok) {
      setState({ kind: "error", message: result?.error ?? (isSpanish ? "No se pudo agendar la clase." : "Could not book the class.") });
      setPending(false);
      return;
    }

    setState({ kind: "success", message: isSpanish ? "Clase individual agendada." : "One-time class booked." });
    setPending(false);
    router.refresh();
  }

  const availableTypes = role === "teacher" ? teacherClassTypeOptions : classTypeOptions;
  const defaultStudent = selectedStudent?.id ?? students[0]?.id;

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {selectedStudent ? (
          <ReadOnlyField label={isSpanish ? "Estudiante" : "Student"} value={`${selectedStudent.name}${selectedStudent.instrument ? ` · ${selectedStudent.instrument}` : ""}`} />
        ) : (
          <Field label={isSpanish ? "Estudiante" : "Student"} htmlFor="studentId">
            <select id="studentId" name="studentId" defaultValue={defaultStudent} required className={selectClassName}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.instrument ? `· ${student.instrument}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        {role === "admin" ? (
          <Field label={isSpanish ? "Docente" : "Teacher"} htmlFor="teacherId">
            <select id="teacherId" name="teacherId" value={selectedTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)} required className={selectClassName}>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label={isSpanish ? "Tipo de clase" : "Class type"} htmlFor="type">
          <select id="type" name="type" defaultValue={role === "admin" ? ClassSessionType.TRIAL : ClassSessionType.MAKEUP} className={selectClassName}>
            {availableTypes.map((type) => <option key={type} value={type}>{classTypeLabel(type, locale)}</option>)}
          </select>
        </Field>
        <Field label={isSpanish ? "Fecha" : "Date"} htmlFor="date"><Input id="date" name="date" type="date" defaultValue={initialDate} required /></Field>
        <Field label={isSpanish ? "Hora local" : "Local time"} htmlFor="startTimeLocal"><Input id="startTimeLocal" name="startTimeLocal" type="time" defaultValue="17:00" required /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label={isSpanish ? "Duración" : "Duration"} htmlFor="durationMin"><Input id="durationMin" name="durationMin" type="number" min={15} max={180} defaultValue={60} required /></Field>
        <Field label={isSpanish ? "Zona horaria" : "Timezone"} htmlFor="timezone"><Input id="timezone" name="timezone" defaultValue={normalizedTimezone} required /></Field>
        <Field label={isSpanish ? "Modalidad" : "Mode"} htmlFor="locationMode">
          <select id="locationMode" name="locationMode" defaultValue="ONLINE" className={selectClassName}>
            <option value="ONLINE">{isSpanish ? "Online" : "Online"}</option>
            <option value="IN_PERSON">{isSpanish ? "Presencial" : "In person"}</option>
            <option value="HYBRID">{isSpanish ? "Híbrida" : "Hybrid"}</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label={isSpanish ? "Instrumento / tipo" : "Instrument / type"} htmlFor="instrument"><Input id="instrument" name="instrument" placeholder={isSpanish ? "Piano, voz..." : "Piano, voice..."} /></Field>
        <Field label={isSpanish ? "Link de clase" : "Class link"} htmlFor="meetingUrl"><Input id="meetingUrl" name="meetingUrl" type="url" defaultValue={selectedTeacher?.meetingUrl ?? defaultMeetingUrl ?? ""} placeholder="https://zoom.us/j/..." /></Field>
      </div>

      <Field label={isSpanish ? "Enfoque de la clase" : "Lesson focus"} htmlFor="lessonFocus"><Textarea id="lessonFocus" name="lessonFocus" rows={2} placeholder={isSpanish ? "Ej: clase de recuperación para repertorio..." : "Example: makeup lesson for repertoire..."} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={isSpanish ? "Nota visible para estudiante" : "Student-visible note"} htmlFor="studentVisibleNote"><Textarea id="studentVisibleNote" name="studentVisibleNote" rows={2} /></Field>
        <Field label={isSpanish ? "Nota interna" : "Internal note"} htmlFor="internalNote"><Textarea id="internalNote" name="internalNote" rows={2} /></Field>
      </div>

      <Button type="submit" variant="gold" disabled={pending || !students.length || (role === "admin" && !teachers.length)}>
        {pending ? (isSpanish ? "Agendando..." : "Booking...") : isSpanish ? "Agendar clase individual" : "Book one-time class"}
      </Button>
      {state ? <p className={`text-sm ${state.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div className="space-y-1.5"><label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--color-ink-soft)]">{label}</label>{children}</div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1.5"><p className="text-sm font-semibold text-[var(--color-ink-soft)]">{label}</p><div className="h-[3.1rem] rounded-[1.1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 py-3 text-sm text-[var(--color-ink)]">{value}</div></div>;
}

const selectClassName = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";
