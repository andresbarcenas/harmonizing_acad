"use client";

import { RecurringTimezoneMode } from "@prisma/client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDictionary } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

type StudentOption = {
  id: string;
  name: string;
  instrument?: string | null;
  timezone?: string | null;
};

type TeacherOption = {
  id: string;
  name: string;
  timezone: string;
  meetingUrl?: string | null;
};

const weekdayOptions = [
  { value: 0, en: "Sun", es: "Dom" },
  { value: 1, en: "Mon", es: "Lun" },
  { value: 2, en: "Tue", es: "Mar" },
  { value: 3, en: "Wed", es: "Mié" },
  { value: 4, en: "Thu", es: "Jue" },
  { value: 5, en: "Fri", es: "Vie" },
  { value: 6, en: "Sat", es: "Sáb" },
];

export function RecurringClassForm({
  students,
  teachers = [],
  role = "teacher",
  defaultTimezone,
  defaultMeetingUrl,
  defaultTeacherId,
  locale = "en",
  selectedStudentId,
}: {
  students: StudentOption[];
  teachers?: TeacherOption[];
  role?: "teacher" | "admin";
  defaultTimezone: string;
  defaultMeetingUrl?: string | null;
  defaultTeacherId?: string | null;
  locale?: AppLocale;
  selectedStudentId?: string | null;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [timezoneMode, setTimezoneMode] = useState<RecurringTimezoneMode>(RecurringTimezoneMode.STUDENT_TIME);
  const [customTimezone, setCustomTimezone] = useState(defaultTimezone);
  const [selectedStudentValue, setSelectedStudentValue] = useState(selectedStudentId ?? students[0]?.id ?? "");
  const [selectedTeacherId, setSelectedTeacherId] = useState(defaultTeacherId ?? teachers[0]?.id ?? "");
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null;
  const teacherTimezone = normalizeIanaTimezone(selectedTeacher?.timezone ?? defaultTimezone);
  const selectedStudent = students.find((student) => student.id === (selectedStudentId ?? selectedStudentValue)) ?? null;
  const studentTimezone = normalizeIanaTimezone(selectedStudent?.timezone ?? defaultTimezone);
  const normalizedCustomTimezone = normalizeIanaTimezone(customTimezone);
  const anchorTimezone =
    timezoneMode === RecurringTimezoneMode.TEACHER_TIME
      ? teacherTimezone
      : timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE
        ? normalizedCustomTimezone
        : studentTimezone;
  const anchorNotice =
    timezoneMode === RecurringTimezoneMode.TEACHER_TIME
      ? dictionary.teacher.recurringTeacherAnchoredNotice
      : timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE
        ? dictionary.teacher.recurringCustomAnchoredNotice
        : dictionary.teacher.recurringStudentAnchoredNotice;

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
      studentId: selectedStudent?.id ?? String(formData.get("studentId") ?? ""),
      teacherId: role === "admin" ? String(formData.get("teacherId") ?? "") : undefined,
      startsOnDate: String(formData.get("startsOnDate") ?? ""),
      startTimeLocal: String(formData.get("startTimeLocal") ?? ""),
      weekdays,
      timezoneMode,
      timezone: timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE ? normalizedCustomTimezone : anchorTimezone,
      durationMin: Number(formData.get("durationMin") ?? 60),
      horizonWeeks: Number(formData.get("horizonWeeks") ?? 8),
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
      setError(data?.error ?? (locale === "es" ? "No se pudieron crear las clases." : "Could not create classes."));
      setConflicts(data?.conflicts ?? []);
      setPending(false);
      return;
    }

    const created = data?.created ?? 0;
    const conflictCount = data?.conflicts?.length ?? 0;
    if (conflictCount) {
      setSuccess(locale === "es" ? `Se crearon ${created} clases. ${conflictCount} bloque(s) tuvieron conflicto.` : `${created} classes were created. ${conflictCount} block(s) had conflicts.`);
      setConflicts(data?.conflicts ?? []);
    } else {
      setSuccess(locale === "es" ? `Se crearon ${created} clases recurrentes.` : `${created} recurring classes were created.`);
    }

    setPending(false);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {selectedStudent ? (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[var(--color-ink-soft)]">{dictionary.teacher.selectedStudent}</p>
            <div className="h-[3.1rem] rounded-[1.1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 py-3 text-sm text-[var(--color-ink)]">
              {selectedStudent.name} {selectedStudent.instrument ? `· ${selectedStudent.instrument}` : ""}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="studentId" className="text-sm font-semibold text-[var(--color-ink-soft)]">
              {dictionary.common.student}
            </label>
            <select
              id="studentId"
              name="studentId"
              value={selectedStudentValue}
              onChange={(event) => setSelectedStudentValue(event.target.value)}
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
        )}
        {role === "admin" ? (
          <div className="space-y-1.5">
            <label htmlFor="recurringTeacherId" className="text-sm font-semibold text-[var(--color-ink-soft)]">
              {locale === "es" ? "Docente" : "Teacher"}
            </label>
            <select
              id="recurringTeacherId"
              name="teacherId"
              value={selectedTeacherId}
              onChange={(event) => setSelectedTeacherId(event.target.value)}
              className="h-[3.1rem] w-full rounded-[1.1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]"
              required
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <label htmlFor="meetingUrl" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            {locale === "es" ? "Link de clase" : "Class link"}
          </label>
          <Input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            defaultValue={selectedTeacher?.meetingUrl ?? defaultMeetingUrl ?? ""}
            placeholder="https://zoom.us/j/..."
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="startsOnDate" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            {locale === "es" ? "Fecha inicial" : "Start date"}
          </label>
          <Input id="startsOnDate" name="startsOnDate" type="date" defaultValue={initialDate} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="startTimeLocal" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            {locale === "es" ? "Hora local" : "Local time"}
          </label>
          <Input id="startTimeLocal" name="startTimeLocal" type="time" defaultValue="18:00" required />
        </div>
      </div>
      <p className="text-xs text-[var(--color-ink-soft)]">
        {dictionary.teacher.teacherTime}: <span className="font-semibold text-[var(--color-ink)]">{teacherTimezone}</span> · {dictionary.teacher.studentTime}:{" "}
        <span className="font-semibold text-[var(--color-ink)]">{studentTimezone}</span>
      </p>

      <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/68 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <label htmlFor="timezoneMode" className="text-sm font-semibold text-[var(--color-ink-soft)]">
              {dictionary.teacher.recurringTimezoneModeLabel}
            </label>
            <select
              id="timezoneMode"
              name="timezoneMode"
              value={timezoneMode}
              onChange={(event) => setTimezoneMode(event.target.value as RecurringTimezoneMode)}
              className="h-[3.1rem] w-full rounded-[1.1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]"
            >
              <option value={RecurringTimezoneMode.STUDENT_TIME}>{dictionary.teacher.recurringStudentTime}</option>
              <option value={RecurringTimezoneMode.TEACHER_TIME}>{dictionary.teacher.recurringTeacherTime}</option>
              {role === "admin" ? <option value={RecurringTimezoneMode.CUSTOM_TIMEZONE}>{dictionary.teacher.recurringCustomTime}</option> : null}
            </select>
          </div>
          {timezoneMode === RecurringTimezoneMode.CUSTOM_TIMEZONE ? (
            <div className="space-y-1.5">
              <label htmlFor="customTimezone" className="text-sm font-semibold text-[var(--color-ink-soft)]">
                {dictionary.teacher.recurringCustomTimezone}
              </label>
              <Input
                id="customTimezone"
                name="customTimezone"
                value={customTimezone}
                onChange={(event) => setCustomTimezone(event.target.value)}
                placeholder="America/New_York"
                required
              />
            </div>
          ) : (
            <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-ink-soft)]">
              {dictionary.common.timezone}: <span className="font-semibold text-[var(--color-ink)]">{anchorTimezone}</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{anchorNotice}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[var(--color-ink-soft)]">{dictionary.teacher.weekdays}</p>
        <div className="flex flex-wrap gap-2">
          {weekdayOptions.map((day) => {
            const active = weekdays.includes(day.value);
            return (
              <Button
                key={day.value}
                type="button"
                size="sm"
                variant={active ? "gold" : "outline"}
                onClick={() =>
                  setWeekdays((previous) => {
                    if (previous.includes(day.value)) {
                      const next = previous.filter((value) => value !== day.value);
                      return next.length ? next : previous;
                    }
                    return [...previous, day.value].sort((a, b) => a - b);
                  })
                }
              >
                {day[locale]}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.teacher.weekdaysHint}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="durationMin" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            {dictionary.teacher.durationMinutes}
          </label>
          <Input id="durationMin" name="durationMin" type="number" min={30} max={180} defaultValue={60} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="horizonWeeks" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            {dictionary.teacher.horizonWeeks}
          </label>
          <Input id="horizonWeeks" name="horizonWeeks" type="number" min={1} max={26} defaultValue={8} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="intervalWeeks" className="text-sm font-semibold text-[var(--color-ink-soft)]">
            {dictionary.teacher.intervalWeeks}
          </label>
          <Input id="intervalWeeks" name="intervalWeeks" type="number" min={1} max={4} defaultValue={1} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lessonFocus" className="text-sm font-semibold text-[var(--color-ink-soft)]">
          {dictionary.teacher.lessonFocusOptional}
        </label>
        <Textarea id="lessonFocus" name="lessonFocus" rows={2} placeholder={dictionary.teacher.lessonFocusPlaceholder} />
      </div>

      <Button type="submit" variant="gold" size="sm" disabled={pending || !students.length || (role === "admin" && !teachers.length)}>
        {pending ? dictionary.teacher.scheduling : dictionary.teacher.scheduleRecurring}
      </Button>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {conflicts.length ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white/72 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
          <p className="font-semibold text-[var(--color-ink)]">{dictionary.teacher.conflictBlocks}</p>
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
