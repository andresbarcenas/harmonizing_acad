"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PracticeAssignmentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { InstrumentSelect } from "@/components/instrument-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";

type SkillOption = { id: string; name: string; instrument: string };
type RepertoireOption = { id: string; title: string };
type AssignmentOption = { id: string; title: string; status: PracticeAssignmentStatus };
type AttachmentOption = { id: string; originalName: string; url: string; sizeBytes: number };
type LessonNoteInitial = {
  summary?: string | null;
  taughtToday?: string | null;
  studentDidWell?: string | null;
  needsImprovement?: string | null;
  homework?: string | null;
  nextLessonFocus?: string | null;
  teacherPrivateNote?: string | null;
  studentVisibleNote?: string | null;
  preparednessRating?: number | null;
  focusRating?: number | null;
  effortRating?: number | null;
  overallLessonRating?: number | null;
  skillRatings?: Array<{ skillCategoryId: string; rating: number; note?: string | null }>;
};

function copy(locale: AppLocale) {
  return locale === "es"
    ? {
        saved: "Guardado correctamente.",
        error: "No se pudo guardar. Intenta de nuevo.",
        saveLesson: "Guardar nota de clase",
        summary: "Resumen de la clase",
        taught: "Qué se trabajó hoy",
        didWell: "Lo que hizo bien",
        improve: "Qué necesita mejorar",
        homework: "Tarea / práctica",
        nextFocus: "Enfoque próxima clase",
        privateNote: "Nota privada docente",
        visibleNote: "Nota visible para estudiante/familia",
        ratings: "Calificaciones",
        skillRatings: "Habilidades observadas",
        chooseSkill: "Elegir habilidad",
        note: "Nota",
        addRepertoire: "Guardar repertorio",
        sheetMusic: "Partitura / hoja de canción",
        attachSheet: "Adjuntar partitura",
        uploadSheet: "Subir archivo",
        deleteSheet: "Eliminar",
        noSheets: "Sin partituras adjuntas.",
        title: "Título",
        composer: "Compositor o artista",
        instrument: "Instrumento",
        level: "Nivel",
        focus: "Sección actual",
        mastery: "Dominio %",
        teacherNotes: "Notas docentes",
        studentNotes: "Notas visibles",
        addAssignment: "Crear tarea de práctica",
        instructions: "Instrucciones",
        dueDate: "Fecha límite",
        expectedMinutes: "Minutos esperados",
        requiresVideo: "Requiere video",
        logPractice: "Registrar práctica",
        practicedOn: "Fecha de práctica",
        minutes: "Minutos",
        mood: "Ánimo 1-5",
        difficulty: "Dificultad 1-5",
        parentNote: "Nota familiar opcional",
        inProgress: "Marcar en progreso",
        complete: "Marcar completada",
        completionNote: "Nota al completar",
        completionNotePlaceholder: "Cuenta brevemente cómo te fue con esta práctica.",
        generateReport: "Generar reporte",
        startDate: "Inicio",
        endDate: "Fin",
        strengths: "Fortalezas",
        improvementAreas: "Áreas de mejora",
        recommendedNextFocus: "Próximo enfoque recomendado",
        finalGrade: "Nota final opcional",
        gradePercentage: "Porcentaje opcional",
      }
    : {
        saved: "Saved successfully.",
        error: "Could not save. Please try again.",
        saveLesson: "Save lesson note",
        summary: "Lesson summary",
        taught: "What was taught",
        didWell: "What went well",
        improve: "Needs improvement",
        homework: "Homework / practice",
        nextFocus: "Next lesson focus",
        privateNote: "Private teacher note",
        visibleNote: "Student/family visible note",
        ratings: "Ratings",
        skillRatings: "Observed skills",
        chooseSkill: "Choose skill",
        note: "Note",
        addRepertoire: "Save repertoire",
        sheetMusic: "Sheet music / song sheet",
        attachSheet: "Attach sheet music",
        uploadSheet: "Upload file",
        deleteSheet: "Delete",
        noSheets: "No sheet music attached.",
        title: "Title",
        composer: "Composer or artist",
        instrument: "Instrument",
        level: "Level",
        focus: "Current section",
        mastery: "Mastery %",
        teacherNotes: "Teacher notes",
        studentNotes: "Visible notes",
        addAssignment: "Create practice assignment",
        instructions: "Instructions",
        dueDate: "Due date",
        expectedMinutes: "Expected minutes",
        requiresVideo: "Requires video",
        logPractice: "Log practice",
        practicedOn: "Practice date",
        minutes: "Minutes",
        mood: "Mood 1-5",
        difficulty: "Difficulty 1-5",
        parentNote: "Optional parent note",
        inProgress: "Mark in progress",
        complete: "Mark completed",
        completionNote: "Completion note",
        completionNotePlaceholder: "Briefly share how this practice went.",
        generateReport: "Generate report",
        startDate: "Start",
        endDate: "End",
        strengths: "Strengths",
        improvementAreas: "Improvement areas",
        recommendedNextFocus: "Recommended next focus",
        finalGrade: "Optional final grade",
        gradePercentage: "Optional percentage",
      };
}

const repertoireStatuses = ["ASSIGNED", "LEARNING", "IMPROVING", "PERFORMANCE_READY", "COMPLETED", "PAUSED"] as const;
const assignmentStatus = {
  assigned: "ASSIGNED",
  inProgress: "IN_PROGRESS",
  completed: "COMPLETED",
} as const satisfies Record<string, PracticeAssignmentStatus>;

export function LessonNoteForm({ sessionId, initial, skillCategories, locale }: { sessionId: string; initial?: LessonNoteInitial | null; skillCategories: SkillOption[]; locale: AppLocale }) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const existingRatings = initial?.skillRatings ?? [];

  async function submit(formData: FormData) {
    setMessage("");
    const skillRatings = [0, 1, 2, 3, 4, 5]
      .map((index) => ({
        skillCategoryId: String(formData.get(`skillCategoryId-${index}`) ?? ""),
        rating: Number(formData.get(`skillRating-${index}`) ?? 0),
        note: String(formData.get(`skillNote-${index}`) ?? "").trim() || undefined,
      }))
      .filter((item) => item.skillCategoryId && item.rating >= 1);

    const payload = {
      sessionId,
      summary: String(formData.get("summary") ?? ""),
      taughtToday: String(formData.get("taughtToday") ?? ""),
      studentDidWell: String(formData.get("studentDidWell") ?? ""),
      needsImprovement: String(formData.get("needsImprovement") ?? ""),
      homework: String(formData.get("homework") ?? ""),
      nextLessonFocus: String(formData.get("nextLessonFocus") ?? ""),
      teacherPrivateNote: String(formData.get("teacherPrivateNote") ?? ""),
      studentVisibleNote: String(formData.get("studentVisibleNote") ?? ""),
      preparednessRating: numberOrUndefined(formData.get("preparednessRating")),
      focusRating: numberOrUndefined(formData.get("focusRating")),
      effortRating: numberOrUndefined(formData.get("effortRating")),
      overallLessonRating: numberOrUndefined(formData.get("overallLessonRating")),
      skillRatings,
    };

    const response = await fetch("/api/progress/lesson-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setMessage(response.ok ? c.saved : ((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? c.error);
    if (response.ok) startTransition(() => router.refresh());
  }

  return (
    <form action={submit} className="space-y-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 p-4">
      <Textarea name="summary" required defaultValue={initial?.summary ?? ""} placeholder={c.summary} />
      <Textarea name="taughtToday" defaultValue={initial?.taughtToday ?? ""} placeholder={c.taught} />
      <div className="grid gap-2 md:grid-cols-2">
        <Textarea name="studentDidWell" defaultValue={initial?.studentDidWell ?? ""} placeholder={c.didWell} />
        <Textarea name="needsImprovement" defaultValue={initial?.needsImprovement ?? ""} placeholder={c.improve} />
        <Textarea name="homework" defaultValue={initial?.homework ?? ""} placeholder={c.homework} />
        <Textarea name="nextLessonFocus" defaultValue={initial?.nextLessonFocus ?? ""} placeholder={c.nextFocus} />
        <Textarea name="studentVisibleNote" defaultValue={initial?.studentVisibleNote ?? ""} placeholder={c.visibleNote} />
        <Textarea name="teacherPrivateNote" defaultValue={initial?.teacherPrivateNote ?? ""} placeholder={c.privateNote} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{c.ratings}</p>
      <div className="grid gap-2 sm:grid-cols-4">
        <RatingInput name="preparednessRating" label="Prep" defaultValue={initial?.preparednessRating} />
        <RatingInput name="focusRating" label="Focus" defaultValue={initial?.focusRating} />
        <RatingInput name="effortRating" label="Effort" defaultValue={initial?.effortRating} />
        <RatingInput name="overallLessonRating" label="Overall" defaultValue={initial?.overallLessonRating} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{c.skillRatings}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white/70 p-2 sm:grid-cols-[1fr_76px]">
            <select name={`skillCategoryId-${index}`} defaultValue={existingRatings[index]?.skillCategoryId ?? ""} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm">
              <option value="">{c.chooseSkill}</option>
              {skillCategories.map((skill) => <option key={skill.id} value={skill.id}>{skill.instrument} · {skill.name}</option>)}
            </select>
            <Input name={`skillRating-${index}`} type="number" min={1} max={5} defaultValue={existingRatings[index]?.rating ?? ""} placeholder="1-5" />
            <Input name={`skillNote-${index}`} defaultValue={existingRatings[index]?.note ?? ""} placeholder={c.note} className="sm:col-span-2" />
          </div>
        ))}
      </div>
      <Button type="submit" variant="gold" disabled={pending}>{c.saveLesson}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </form>
  );
}

export function RepertoireForm({ studentId, locale }: { studentId: string; locale: AppLocale }) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/progress/repertoire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, studentId, masteryPercent: Number(payload.masteryPercent ?? 0), currentTempo: numberOrUndefined(payload.currentTempo), targetTempo: numberOrUndefined(payload.targetTempo), startDate: toIsoDate(payload.startDate), targetDate: toIsoDate(payload.targetDate), completedDate: toIsoDate(payload.completedDate) }) });
    setMessage(response.ok ? c.saved : c.error);
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="grid gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 p-4 md:grid-cols-2">
      <Input name="title" required placeholder={c.title} />
      <Input name="composerOrArtist" placeholder={c.composer} />
      <InstrumentSelect name="instrument" locale={locale} required aria-label={c.instrument} />
      <Input name="level" placeholder={c.level} />
      <select name="status" defaultValue="ASSIGNED" className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm">{repertoireStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
      <Input name="masteryPercent" type="number" min={0} max={100} defaultValue={0} placeholder={c.mastery} />
      <Input name="currentFocusSection" placeholder={c.focus} />
      <Input name="currentTempo" type="number" placeholder="Tempo actual" />
      <Input name="targetTempo" type="number" placeholder="Tempo meta" />
      <Input name="targetDate" type="date" />
      <Textarea name="teacherNotes" placeholder={c.teacherNotes} className="md:col-span-2" />
      <Textarea name="studentVisibleNotes" placeholder={c.studentNotes} className="md:col-span-2" />
      <Button type="submit" variant="gold" className="md:col-span-2">{c.addRepertoire}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)] md:col-span-2">{message}</p> : null}
    </form>
  );
}

export function RepertoireAttachmentForm({
  repertoireItemId,
  attachments,
  locale,
}: {
  repertoireItemId: string;
  attachments: AttachmentOption[];
  locale: AppLocale;
}) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/progress/repertoire/${repertoireItemId}/attachments`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setMessage(response.ok ? c.saved : payload?.error ?? c.error);
    setPending(false);
    if (response.ok) router.refresh();
  }

  async function remove(attachmentId: string) {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/progress/repertoire/${repertoireItemId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setMessage(response.ok ? c.saved : payload?.error ?? c.error);
    setPending(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{c.sheetMusic}</p>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white/74 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 truncate font-semibold text-[var(--color-ink)]">
              {attachment.originalName}
            </a>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => remove(attachment.id)}>{c.deleteSheet}</Button>
          </div>
        ))}
        {!attachments.length ? <p className="text-xs text-[var(--color-ink-soft)]">{c.noSheets}</p> : null}
      </div>
      <form action={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required aria-label={c.attachSheet} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>{c.uploadSheet}</Button>
      </form>
      {message ? <p className="text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  );
}

export function PracticeAssignmentForm({ studentId, lessonNoteId, classSessionId, repertoire, skills, locale }: { studentId: string; lessonNoteId?: string; classSessionId?: string; repertoire: RepertoireOption[]; skills: SkillOption[]; locale: AppLocale }) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/progress/practice-assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, studentId, lessonNoteId, classSessionId, expectedMinutes: numberOrUndefined(payload.expectedMinutes), requiresVideo: payload.requiresVideo === "on", dueDate: toIsoDate(payload.dueDate) }) });
    setMessage(response.ok ? c.saved : c.error);
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="grid gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 p-4 md:grid-cols-2">
      <Input name="title" required placeholder={c.title} />
      <Input name="dueDate" type="date" aria-label={c.dueDate} />
      <select name="repertoireItemId" className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"><option value="">Repertorio</option>{repertoire.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <select name="skillCategoryId" className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"><option value="">{c.chooseSkill}</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.instrument} · {skill.name}</option>)}</select>
      <Input name="expectedMinutes" type="number" min={1} max={600} placeholder={c.expectedMinutes} />
      <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"><input name="requiresVideo" type="checkbox" /> {c.requiresVideo}</label>
      <Textarea name="instructions" required placeholder={c.instructions} className="md:col-span-2" />
      <Button type="submit" variant="gold" className="md:col-span-2">{c.addAssignment}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)] md:col-span-2">{message}</p> : null}
    </form>
  );
}

export function PracticeLogForm({ assignments, repertoire, skills, locale }: { assignments: AssignmentOption[]; repertoire: RepertoireOption[]; skills: SkillOption[]; locale: AppLocale }) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/progress/practice-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, practicedOn: toIsoDate(payload.practicedOn) ?? new Date().toISOString(), minutesPracticed: Number(payload.minutesPracticed), moodRating: numberOrUndefined(payload.moodRating), difficultyRating: numberOrUndefined(payload.difficultyRating) }) });
    setMessage(response.ok ? c.saved : c.error);
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="grid gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 p-4 md:grid-cols-2">
      <Input name="practicedOn" type="date" required aria-label={c.practicedOn} />
      <Input name="minutesPracticed" type="number" required min={1} max={600} placeholder={c.minutes} />
      <select name="assignmentId" className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"><option value="">Tarea</option>{assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <select name="repertoireItemId" className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"><option value="">Repertorio</option>{repertoire.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <select name="skillCategoryId" className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"><option value="">{c.chooseSkill}</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.instrument} · {skill.name}</option>)}</select>
      <Input name="moodRating" type="number" min={1} max={5} placeholder={c.mood} />
      <Input name="difficultyRating" type="number" min={1} max={5} placeholder={c.difficulty} />
      <Textarea name="notes" placeholder={c.note} className="md:col-span-2" />
      <Textarea name="parentNote" placeholder={c.parentNote} className="md:col-span-2" />
      <Button type="submit" variant="gold" className="md:col-span-2">{c.logPractice}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)] md:col-span-2">{message}</p> : null}
    </form>
  );
}

export function AssignmentStatusActions({ assignmentId, status, locale, initialCompletionNote }: { assignmentId: string; status: PracticeAssignmentStatus; locale: AppLocale; initialCompletionNote?: string | null }) {
  const router = useRouter();
  const c = copy(locale);
  const [completionNote, setCompletionNote] = useState(initialCompletionNote ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function update(nextStatus: typeof assignmentStatus.inProgress | typeof assignmentStatus.completed) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/progress/practice-assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, status: nextStatus, completionNote: nextStatus === assignmentStatus.completed ? completionNote : undefined }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(payload?.error ?? c.error);
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }
  return (
    <div className="space-y-2">
      {[assignmentStatus.assigned, assignmentStatus.inProgress].includes(status as typeof assignmentStatus.assigned | typeof assignmentStatus.inProgress) ? (
        <Textarea
          value={completionNote}
          onChange={(event) => setCompletionNote(event.target.value)}
          placeholder={c.completionNotePlaceholder}
          className="min-h-20"
          aria-label={c.completionNote}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === assignmentStatus.assigned ? <Button size="sm" variant="outline" disabled={pending} onClick={() => update(assignmentStatus.inProgress)}>{c.inProgress}</Button> : null}
        {[assignmentStatus.assigned, assignmentStatus.inProgress].includes(status as typeof assignmentStatus.assigned | typeof assignmentStatus.inProgress) ? <Button size="sm" variant="gold" disabled={pending} onClick={() => update(assignmentStatus.completed)}>{c.complete}</Button> : null}
      </div>
      {message ? <p className="text-xs text-rose-600">{message}</p> : null}
    </div>
  );
}

export function ProgressReportForm({ studentId, locale }: { studentId: string; locale: AppLocale }) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/progress/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, studentId, startDate: toIsoDate(payload.startDate), endDate: toIsoDate(payload.endDate), gradePercentage: numberOrUndefined(payload.gradePercentage) }) });
    setMessage(response.ok ? c.saved : c.error);
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="grid gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 p-4 md:grid-cols-2">
      <Input name="startDate" type="date" required aria-label={c.startDate} />
      <Input name="endDate" type="date" required aria-label={c.endDate} />
      <Textarea name="teacherSummary" placeholder={c.summary} className="md:col-span-2" />
      <Textarea name="strengths" placeholder={c.strengths} />
      <Textarea name="improvementAreas" placeholder={c.improvementAreas} />
      <Textarea name="recommendedNextFocus" placeholder={c.recommendedNextFocus} className="md:col-span-2" />
      <Input name="finalGrade" placeholder={c.finalGrade} />
      <Input name="gradePercentage" type="number" min={0} max={100} placeholder={c.gradePercentage} />
      <Button type="submit" variant="gold" className="md:col-span-2">{c.generateReport}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)] md:col-span-2">{message}</p> : null}
    </form>
  );
}

function RatingInput({ name, label, defaultValue }: { name: string; label: string; defaultValue?: number | null }) {
  return <Input name={name} type="number" min={1} max={5} defaultValue={defaultValue ?? ""} placeholder={`${label} 1-5`} />;
}

function numberOrUndefined(value: FormDataEntryValue | null | unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function toIsoDate(value: FormDataEntryValue | null | unknown) {
  if (typeof value !== "string" || !value) return undefined;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}
