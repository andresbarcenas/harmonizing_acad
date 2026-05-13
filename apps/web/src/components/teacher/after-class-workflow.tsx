"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type CompletionStatus = "COMPLETED" | "NO_SHOW" | "CANCELLED" | "RESCHEDULE_PENDING";
type LessonInstrument = "PIANO" | "VOICE";
type RepertoireStatus = "ASSIGNED" | "LEARNING" | "IMPROVING" | "PERFORMANCE_READY" | "COMPLETED" | "PAUSED";

type SkillOption = { id: string; name: string; instrument: string };
type RepertoireOption = {
  id: string;
  title: string;
  composerOrArtist?: string | null;
  instrument: string;
  status: RepertoireStatus;
  masteryPercent: number;
  currentFocusSection?: string | null;
  currentTempo?: number | null;
  targetTempo?: number | null;
  teacherNotes?: string | null;
  studentVisibleNotes?: string | null;
};

type LessonNoteState = {
  summary: string;
  taughtToday: string;
  studentDidWell: string;
  needsImprovement: string;
  homework: string;
  nextLessonFocus: string;
  teacherPrivateNote: string;
  studentVisibleNote: string;
  preparednessRating?: number;
  focusRating?: number;
  effortRating?: number;
  overallLessonRating?: number;
};

type SkillRatingState = { skillCategoryId: string; rating: number; note: string };
type RepertoireUpdateState = {
  repertoireItemId: string;
  title: string;
  selected: boolean;
  status: RepertoireStatus;
  masteryPercent: number;
  currentFocusSection: string;
  currentTempo: string;
  targetTempo: string;
  teacherNotes: string;
  studentVisibleNotes: string;
};
type NewRepertoireState = {
  enabled: boolean;
  title: string;
  composerOrArtist: string;
  instrument: string;
  level: string;
  status: RepertoireStatus;
  masteryPercent: number;
  currentFocusSection: string;
  currentTempo: string;
  targetTempo: string;
  teacherNotes: string;
  studentVisibleNotes: string;
};
type AssignmentState = {
  id: string;
  title: string;
  instructions: string;
  dueDate: string;
  expectedMinutes: string;
  repertoireItemId: string;
  skillCategoryId: string;
  requiresVideo: boolean;
};

type WorkflowProps = {
  locale: AppLocale;
  classId: string;
  classDateLabel: string;
  initialStatus: CompletionStatus | "SCHEDULED";
  initialLessonInstrument?: string | null;
  lessonFocus?: string | null;
  student: {
    id: string;
    name: string;
    timezone: string;
    preferredInstrument?: string | null;
  };
  lessonNote?: (LessonNoteState & {
    skillRatings: Array<{ skillCategoryId: string; rating: number; note?: string | null }>;
    practiceAssignments: Array<{ id: string; title: string; requiresVideo: boolean }>;
  }) | null;
  skillCategories: SkillOption[];
  repertoireItems: RepertoireOption[];
};

const selectClass = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";

const repertoireStatuses: RepertoireStatus[] = ["ASSIGNED", "LEARNING", "IMPROVING", "PERFORMANCE_READY", "COMPLETED", "PAUSED"];

const statusOptions: Array<{ value: CompletionStatus; es: string; en: string; descriptionEs: string; descriptionEn: string }> = [
  { value: "COMPLETED", es: "Completada", en: "Completed", descriptionEs: "Captura progreso, tareas y nota visible.", descriptionEn: "Capture progress, homework, and visible notes." },
  { value: "NO_SHOW", es: "Estudiante ausente", en: "Student absent", descriptionEs: "Registra la ausencia sin crear nota de progreso.", descriptionEn: "Record absence without a progress note." },
  { value: "CANCELLED", es: "Cancelada", en: "Cancelled", descriptionEs: "Marca la clase como cancelada.", descriptionEn: "Mark the class as cancelled." },
  { value: "RESCHEDULE_PENDING", es: "Necesita reagendar", en: "Needs reschedule", descriptionEs: "Deja la clase pendiente de coordinación.", descriptionEn: "Leave the class pending coordination." },
];

function copy(locale: AppLocale) {
  return locale === "es" ? {
    eyebrow: "Flujo post-clase",
    title: "Completar clase en menos de 2 minutos",
    description: "Confirma asistencia, resume la clase, califica habilidades y deja la práctica lista para el estudiante.",
    status: "Estado",
    note: "Nota",
    skills: "Habilidades",
    repertoire: "Repertorio",
    practice: "Práctica",
    review: "Revisar",
    lessonType: "Tipo de clase",
    piano: "Piano",
    singing: "Canto / técnica vocal",
    skillScope: "Mostrando habilidades de",
    summary: "Resumen de la clase",
    taught: "Temas trabajados",
    didWell: "Lo que hizo bien",
    improve: "Áreas a mejorar",
    homework: "Tarea / instrucciones de práctica",
    nextFocus: "Enfoque para la próxima clase",
    privateNote: "Nota privada del profesor",
    visibleNote: "Nota visible para estudiante/padre",
    quickExcellent: "Excelente",
    quickImproving: "Mejorando",
    quickPractice: "Necesita práctica",
    skillNote: "Nota breve sobre esta habilidad",
    prep: "Preparación",
    focus: "Enfoque/actitud",
    effort: "Esfuerzo",
    overall: "Clase general",
    noSkills: "No hay habilidades activas para este instrumento.",
    selectToUpdate: "Selecciona las piezas que quieres actualizar hoy.",
    addSong: "Agregar nueva pieza o canción",
    titleField: "Título",
    artist: "Compositor o artista",
    instrument: "Instrumento",
    level: "Nivel",
    mastery: "Dominio %",
    section: "Sección actual, por ejemplo compases 1-8",
    currentTempo: "Tempo actual",
    targetTempo: "Tempo meta",
    teacherNotes: "Notas docentes",
    studentNotes: "Notas visibles",
    assignmentTitle: "Título de la tarea",
    assignmentInstructions: "Instrucciones de práctica",
    dueDate: "Fecha límite",
    expectedMinutes: "Minutos esperados",
    relatedSong: "Repertorio relacionado",
    relatedSkill: "Habilidad relacionada",
    requiresVideo: "Solicitar video de práctica",
    addAssignment: "Agregar otra tarea",
    removeAssignment: "Quitar tarea",
    notify: "Notificar al estudiante/padre dentro de la app",
    saved: "Clase completada y progreso guardado.",
    error: "No se pudo guardar el flujo.",
    back: "Atrás",
    next: "Continuar",
    save: "Guardar y notificar",
    saving: "Guardando...",
    doneIntro: "Esto se guardará al confirmar:",
    noAssignment: "No crear tareas desde este flujo.",
    existingAssignments: "Tareas ya creadas desde esta nota",
    draftRestored: "Borrador local restaurado.",
    exit: "Volver a progreso",
  } : {
    eyebrow: "After-class workflow",
    title: "Complete class in under 2 minutes",
    description: "Confirm attendance, summarize the lesson, rate skills, and prepare practice for the student.",
    status: "Status",
    note: "Note",
    skills: "Skills",
    repertoire: "Repertoire",
    practice: "Practice",
    review: "Review",
    lessonType: "Lesson type",
    piano: "Piano",
    singing: "Singing / vocal technique",
    skillScope: "Showing skills for",
    summary: "Lesson summary",
    taught: "Topics worked on",
    didWell: "What went well",
    improve: "Improvement areas",
    homework: "Homework / practice instructions",
    nextFocus: "Next lesson focus",
    privateNote: "Private teacher note",
    visibleNote: "Student/parent visible note",
    quickExcellent: "Excellent",
    quickImproving: "Improving",
    quickPractice: "Needs practice",
    skillNote: "Brief note about this skill",
    prep: "Preparedness",
    focus: "Focus/attitude",
    effort: "Effort",
    overall: "Overall lesson",
    noSkills: "No active skills for this instrument.",
    selectToUpdate: "Select the pieces you want to update today.",
    addSong: "Add new piece or song",
    titleField: "Title",
    artist: "Composer or artist",
    instrument: "Instrument",
    level: "Level",
    mastery: "Mastery %",
    section: "Current section, for example measures 1-8",
    currentTempo: "Current tempo",
    targetTempo: "Target tempo",
    teacherNotes: "Teacher notes",
    studentNotes: "Visible notes",
    assignmentTitle: "Assignment title",
    assignmentInstructions: "Practice instructions",
    dueDate: "Due date",
    expectedMinutes: "Expected minutes",
    relatedSong: "Related repertoire",
    relatedSkill: "Related skill",
    requiresVideo: "Request practice video",
    addAssignment: "Add another assignment",
    removeAssignment: "Remove assignment",
    notify: "Notify student/parent in app",
    saved: "Class completed and progress saved.",
    error: "Could not save workflow.",
    back: "Back",
    next: "Continue",
    save: "Save and notify",
    saving: "Saving...",
    doneIntro: "This will be saved when you confirm:",
    noAssignment: "Do not create assignments from this workflow.",
    existingAssignments: "Assignments already created from this note",
    draftRestored: "Local draft restored.",
    exit: "Back to progress",
  };
}

export function AfterClassWorkflow(props: WorkflowProps) {
  const router = useRouter();
  const c = copy(props.locale);
  const draftKey = `harmonizing:after-class:${props.classId}`;
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [status, setStatus] = useState<CompletionStatus>(props.initialStatus === "SCHEDULED" ? "COMPLETED" : props.initialStatus);
  const [lessonInstrument, setLessonInstrument] = useState<LessonInstrument>(() => inferLessonInstrument(props.initialLessonInstrument ?? props.student.preferredInstrument));
  const [step, setStep] = useState(0);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [lessonNote, setLessonNote] = useState<LessonNoteState>(() => ({
    summary: props.lessonNote?.summary ?? "",
    taughtToday: props.lessonNote?.taughtToday ?? props.lessonFocus ?? "",
    studentDidWell: props.lessonNote?.studentDidWell ?? "",
    needsImprovement: props.lessonNote?.needsImprovement ?? "",
    homework: props.lessonNote?.homework ?? "",
    nextLessonFocus: props.lessonNote?.nextLessonFocus ?? "",
    teacherPrivateNote: props.lessonNote?.teacherPrivateNote ?? "",
    studentVisibleNote: props.lessonNote?.studentVisibleNote ?? "",
    preparednessRating: props.lessonNote?.preparednessRating ?? undefined,
    focusRating: props.lessonNote?.focusRating ?? undefined,
    effortRating: props.lessonNote?.effortRating ?? undefined,
    overallLessonRating: props.lessonNote?.overallLessonRating ?? undefined,
  }));
  const [skillRatings, setSkillRatings] = useState<SkillRatingState[]>(() => buildInitialSkillRatings(props.skillCategories, props.lessonNote?.skillRatings ?? []));
  const [repertoireUpdates, setRepertoireUpdates] = useState<RepertoireUpdateState[]>(() => props.repertoireItems.map(toRepertoireUpdate));
  const [newRepertoire, setNewRepertoire] = useState<NewRepertoireState>(() => ({
    enabled: false,
    title: "",
    composerOrArtist: "",
    instrument: props.student.preferredInstrument ?? "Piano",
    level: "",
    status: "ASSIGNED",
    masteryPercent: 0,
    currentFocusSection: "",
    currentTempo: "",
    targetTempo: "",
    teacherNotes: "",
    studentVisibleNotes: "",
  }));
  const [assignments, setAssignments] = useState<AssignmentState[]>(() => [newAssignment()]);

  const steps = status === "COMPLETED"
    ? [c.status, c.note, c.skills, c.repertoire, c.practice, c.review]
    : [c.status, c.review];
  const activeStepLabel = steps[Math.min(step, steps.length - 1)];
  const filteredSkills = useMemo(() => filterSkillsForLesson(props.skillCategories, lessonInstrument), [lessonInstrument, props.skillCategories]);
  const filteredSkillIds = useMemo(() => new Set(filteredSkills.map((skill) => skill.id)), [filteredSkills]);
  const selectedRatings = skillRatings.filter((rating) => rating.rating > 0 && filteredSkillIds.has(rating.skillCategoryId));
  const selectedRepertoire = repertoireUpdates.filter((item) => item.selected);
  const validAssignments = assignments.filter((assignment) => assignment.title.trim() && assignment.instructions.trim());
  const videoRequested = validAssignments.some((assignment) => assignment.requiresVideo);

  useEffect(() => {
    const stored = window.localStorage.getItem(draftKey);
    if (!stored) {
      setHydratedDraft(true);
      return;
    }
    try {
      const draft = JSON.parse(stored) as Partial<{
        status: CompletionStatus;
        lessonInstrument: LessonInstrument;
        notifyStudent: boolean;
        lessonNote: LessonNoteState;
        skillRatings: SkillRatingState[];
        repertoireUpdates: RepertoireUpdateState[];
        newRepertoire: NewRepertoireState;
        assignments: AssignmentState[];
      }>;
      if (draft.status) setStatus(draft.status);
      if (draft.lessonInstrument) setLessonInstrument(draft.lessonInstrument);
      if (typeof draft.notifyStudent === "boolean") setNotifyStudent(draft.notifyStudent);
      if (draft.lessonNote) setLessonNote(draft.lessonNote);
      if (draft.skillRatings) setSkillRatings(draft.skillRatings);
      if (draft.repertoireUpdates) setRepertoireUpdates(draft.repertoireUpdates);
      if (draft.newRepertoire) setNewRepertoire(draft.newRepertoire);
      if (draft.assignments) setAssignments(draft.assignments);
      setMessage({ kind: "info", text: c.draftRestored });
    } catch {
      window.localStorage.removeItem(draftKey);
    } finally {
      setHydratedDraft(true);
    }
  }, [c.draftRestored, draftKey]);

  useEffect(() => {
    if (!hydratedDraft) return;
    window.localStorage.setItem(draftKey, JSON.stringify({ status, lessonInstrument, notifyStudent, lessonNote, skillRatings, repertoireUpdates, newRepertoire, assignments }));
  }, [assignments, draftKey, hydratedDraft, lessonInstrument, lessonNote, newRepertoire, notifyStudent, repertoireUpdates, skillRatings, status]);

  useEffect(() => {
    if (step > steps.length - 1) setStep(steps.length - 1);
  }, [step, steps.length]);

  const canContinue = useMemo(() => {
    if (status !== "COMPLETED") return true;
    if (activeStepLabel === c.note) return lessonNote.summary.trim().length >= 3;
    return true;
  }, [activeStepLabel, c.note, lessonNote.summary, status]);

  async function submit() {
    setMessage(null);
    setSaving(true);
    const payload = {
      status,
      lessonInstrument,
      notifyStudent,
      lessonNote,
      skillRatings: status === "COMPLETED" ? selectedRatings.map(({ skillCategoryId, rating, note }) => ({ skillCategoryId, rating, note })) : [],
      repertoireUpdates: status === "COMPLETED" ? selectedRepertoire.map((item) => ({
        repertoireItemId: item.repertoireItemId,
        status: item.status,
        masteryPercent: item.masteryPercent,
        currentFocusSection: item.currentFocusSection,
        teacherNotes: item.teacherNotes,
        studentVisibleNotes: item.studentVisibleNotes,
        currentTempo: numberOrUndefined(item.currentTempo),
        targetTempo: numberOrUndefined(item.targetTempo),
      })) : [],
      newRepertoireItems: status === "COMPLETED" && newRepertoire.enabled && newRepertoire.title.trim() ? [{
        title: newRepertoire.title,
        composerOrArtist: newRepertoire.composerOrArtist,
        instrument: newRepertoire.instrument,
        level: newRepertoire.level,
        status: newRepertoire.status,
        masteryPercent: newRepertoire.masteryPercent,
        currentFocusSection: newRepertoire.currentFocusSection,
        currentTempo: numberOrUndefined(newRepertoire.currentTempo),
        targetTempo: numberOrUndefined(newRepertoire.targetTempo),
        teacherNotes: newRepertoire.teacherNotes,
        studentVisibleNotes: newRepertoire.studentVisibleNotes,
      }] : [],
      assignments: status === "COMPLETED" ? validAssignments.map((assignment) => ({
        title: assignment.title,
        instructions: assignment.instructions,
        dueDate: assignment.dueDate ? new Date(`${assignment.dueDate}T12:00:00.000Z`).toISOString() : undefined,
        expectedMinutes: numberOrUndefined(assignment.expectedMinutes),
        repertoireItemId: assignment.repertoireItemId || undefined,
        skillCategoryId: assignment.skillCategoryId || undefined,
        requiresVideo: assignment.requiresVideo,
      })) : [],
    };

    const response = await fetch(`/api/teacher/classes/${props.classId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setMessage({ kind: "error", text: body?.error ?? c.error });
      setSaving(false);
      return;
    }

    window.localStorage.removeItem(draftKey);
    setMessage({ kind: "success", text: c.saved });
    startTransition(() => router.push(`/teacher/progress?studentId=${props.student.id}`));
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">{c.eyebrow}</p>
            <CardTitle className="mt-2 font-display text-4xl font-normal tracking-[-0.05em] md:text-5xl">{c.title}</CardTitle>
            <CardDescription>{c.description}</CardDescription>
          </div>
          <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/74 p-4 text-sm lg:min-w-72">
            <p className="font-semibold text-[var(--color-ink)]">{props.student.name}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">{props.classDateLabel}</p>
            <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{lessonInstrumentLabel(lessonInstrument, props.locale)} · {props.student.timezone}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                index === step ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)]" : "border-[var(--color-border)] bg-white/74 text-[var(--color-ink-soft)]",
              )}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Card className="min-h-[28rem]">
          {status === "COMPLETED" ? (
            <LessonInstrumentSelector c={c} locale={props.locale} value={lessonInstrument} onChange={setLessonInstrument} skillCount={filteredSkills.length} />
          ) : null}
          {activeStepLabel === c.status ? <StatusStep locale={props.locale} status={status} onChange={setStatus} /> : null}
          {activeStepLabel === c.note && status === "COMPLETED" ? <LessonNoteStep c={c} note={lessonNote} onChange={setLessonNote} /> : null}
          {activeStepLabel === c.skills && status === "COMPLETED" ? <SkillStep c={c} skills={filteredSkills} ratings={skillRatings} onChange={setSkillRatings} /> : null}
          {activeStepLabel === c.repertoire && status === "COMPLETED" ? <RepertoireStep c={c} items={repertoireUpdates} setItems={setRepertoireUpdates} newItem={newRepertoire} setNewItem={setNewRepertoire} /> : null}
          {activeStepLabel === c.practice && status === "COMPLETED" ? <PracticeStep c={c} assignments={assignments} setAssignments={setAssignments} skills={filteredSkills} repertoire={props.repertoireItems} existingAssignments={props.lessonNote?.practiceAssignments ?? []} /> : null}
          {activeStepLabel === c.review ? (
            <ReviewStep
              c={c}
              locale={props.locale}
              status={status}
              summary={lessonNote.summary}
              ratings={selectedRatings}
              skills={filteredSkills}
              repertoire={selectedRepertoire}
              assignments={validAssignments}
              videoRequested={videoRequested}
              notifyStudent={notifyStudent}
              setNotifyStudent={setNotifyStudent}
            />
          ) : null}
        </Card>

        <aside className="space-y-3 xl:sticky xl:top-5 xl:self-start">
          <Card>
            <CardTitle>{activeStepLabel}</CardTitle>
            <CardDescription>{status === "COMPLETED" ? `${selectedRatings.length} habilidades · ${validAssignments.length} tareas` : statusLabel(status, props.locale)}</CardDescription>
            <div className="mt-4 space-y-2 text-sm text-[var(--color-ink-soft)]">
              <p>{c.summary}: {lessonNote.summary || "-"}</p>
              <p>{c.requiresVideo}: {videoRequested ? (props.locale === "es" ? "Sí" : "Yes") : "No"}</p>
            </div>
          </Card>
          {message ? (
            <div className={cn(
              "rounded-[1.2rem] border px-4 py-3 text-sm",
              message.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--color-border)] bg-white/76 text-[var(--color-ink-soft)]",
            )}>
              {message.text}
            </div>
          ) : null}
        </aside>
      </div>

      <div className="sticky bottom-3 z-10 rounded-[1.4rem] border border-[var(--color-border)] bg-white/88 p-3 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => (step === 0 ? router.push(`/teacher/progress?studentId=${props.student.id}`) : setStep((current) => Math.max(0, current - 1)))}>
              {step === 0 ? c.exit : c.back}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step < steps.length - 1 ? (
              <Button className="w-full sm:w-auto" type="button" variant="gold" disabled={!canContinue} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>{c.next}</Button>
            ) : (
              <Button className="w-full sm:w-auto" type="button" variant="gold" disabled={pending || saving} onClick={submit}>{pending || saving ? c.saving : c.save}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStep({ locale, status, onChange }: { locale: AppLocale; status: CompletionStatus; onChange: (status: CompletionStatus) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {statusOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[1.3rem] border p-4 text-left transition",
            status === option.value ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] shadow-[var(--shadow-glow)]" : "border-[var(--color-border)] bg-white/70 hover:border-[var(--color-gold)]",
          )}
        >
          <p className="font-semibold text-[var(--color-ink)]">{locale === "es" ? option.es : option.en}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{locale === "es" ? option.descriptionEs : option.descriptionEn}</p>
        </button>
      ))}
    </div>
  );
}

function LessonInstrumentSelector({
  c,
  locale,
  value,
  onChange,
  skillCount,
}: {
  c: ReturnType<typeof copy>;
  locale: AppLocale;
  value: LessonInstrument;
  onChange: (value: LessonInstrument) => void;
  skillCount: number;
}) {
  return (
    <div className="mb-4 rounded-[1.2rem] border border-[var(--color-border)] bg-white/74 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{c.lessonType}</p>
          <p className="text-sm text-[var(--color-ink-soft)]">{c.skillScope} {lessonInstrumentLabel(value, locale)} · {skillCount} {locale === "es" ? "habilidades" : "skills"}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-72">
          <Button type="button" size="sm" variant={value === "PIANO" ? "gold" : "outline"} onClick={() => onChange("PIANO")}>{c.piano}</Button>
          <Button type="button" size="sm" variant={value === "VOICE" ? "gold" : "outline"} onClick={() => onChange("VOICE")}>{c.singing}</Button>
        </div>
      </div>
    </div>
  );
}

function LessonNoteStep({ c, note, onChange }: { c: ReturnType<typeof copy>; note: LessonNoteState; onChange: (note: LessonNoteState) => void }) {
  return (
    <div className="space-y-3">
      <Textarea required value={note.summary} onChange={(event) => onChange({ ...note, summary: event.target.value })} placeholder={c.summary} />
      <Textarea value={note.taughtToday} onChange={(event) => onChange({ ...note, taughtToday: event.target.value })} placeholder={c.taught} />
      <div className="grid gap-3 md:grid-cols-2">
        <Textarea value={note.studentDidWell} onChange={(event) => onChange({ ...note, studentDidWell: event.target.value })} placeholder={c.didWell} />
        <Textarea value={note.needsImprovement} onChange={(event) => onChange({ ...note, needsImprovement: event.target.value })} placeholder={c.improve} />
        <Textarea value={note.homework} onChange={(event) => onChange({ ...note, homework: event.target.value })} placeholder={c.homework} />
        <Textarea value={note.nextLessonFocus} onChange={(event) => onChange({ ...note, nextLessonFocus: event.target.value })} placeholder={c.nextFocus} />
        <Textarea value={note.studentVisibleNote} onChange={(event) => onChange({ ...note, studentVisibleNote: event.target.value })} placeholder={c.visibleNote} />
        <Textarea value={note.teacherPrivateNote} onChange={(event) => onChange({ ...note, teacherPrivateNote: event.target.value })} placeholder={c.privateNote} className="md:col-span-2" />
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <RatingInput label={c.prep} value={note.preparednessRating} onChange={(value) => onChange({ ...note, preparednessRating: value })} />
        <RatingInput label={c.focus} value={note.focusRating} onChange={(value) => onChange({ ...note, focusRating: value })} />
        <RatingInput label={c.effort} value={note.effortRating} onChange={(value) => onChange({ ...note, effortRating: value })} />
        <RatingInput label={c.overall} value={note.overallLessonRating} onChange={(value) => onChange({ ...note, overallLessonRating: value })} />
      </div>
    </div>
  );
}

function SkillStep({ c, skills, ratings, onChange }: { c: ReturnType<typeof copy>; skills: SkillOption[]; ratings: SkillRatingState[]; onChange: (ratings: SkillRatingState[]) => void }) {
  if (!skills.length) return <CardDescription>{c.noSkills}</CardDescription>;
  function update(skillCategoryId: string, patch: Partial<SkillRatingState>) {
    onChange(ratings.map((rating) => rating.skillCategoryId === skillCategoryId ? { ...rating, ...patch } : rating));
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {skills.map((skill) => {
        const rating = ratings.find((item) => item.skillCategoryId === skill.id) ?? { skillCategoryId: skill.id, rating: 0, note: "" };
        return (
          <div key={rating.skillCategoryId} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{skill.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{skill.instrument}</p>
              </div>
              {rating.rating ? <Badge variant="gold">{rating.rating}/5</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={rating.rating === 5 ? "gold" : "outline"} onClick={() => update(rating.skillCategoryId, { rating: 5 })}>{c.quickExcellent}</Button>
              <Button type="button" size="sm" variant={rating.rating === 4 ? "gold" : "outline"} onClick={() => update(rating.skillCategoryId, { rating: 4 })}>{c.quickImproving}</Button>
              <Button type="button" size="sm" variant={rating.rating === 2 ? "gold" : "outline"} onClick={() => update(rating.skillCategoryId, { rating: 2 })}>{c.quickPractice}</Button>
            </div>
            <Input className="mt-3" type="number" min={1} max={5} value={rating.rating || ""} onChange={(event) => update(rating.skillCategoryId, { rating: Number(event.target.value) })} placeholder="1-5" />
            <Input className="mt-2" value={rating.note} onChange={(event) => update(rating.skillCategoryId, { note: event.target.value })} placeholder={c.skillNote} />
          </div>
        );
      })}
    </div>
  );
}

function RepertoireStep({ c, items, setItems, newItem, setNewItem }: { c: ReturnType<typeof copy>; items: RepertoireUpdateState[]; setItems: (items: RepertoireUpdateState[]) => void; newItem: NewRepertoireState; setNewItem: (item: NewRepertoireState) => void }) {
  function update(id: string, patch: Partial<RepertoireUpdateState>) {
    setItems(items.map((item) => item.repertoireItemId === id ? { ...item, ...patch } : item));
  }
  return (
    <div className="space-y-4">
      <CardDescription>{c.selectToUpdate}</CardDescription>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.repertoireItemId} className={cn("rounded-[1.2rem] border p-3", item.selected ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)]/70" : "border-[var(--color-border)] bg-white/72")}>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.selected} onChange={(event) => update(item.repertoireItemId, { selected: event.target.checked })} /> {item.title}</label>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <select className={selectClass} value={item.status} onChange={(event) => update(item.repertoireItemId, { status: event.target.value as RepertoireStatus })}>{repertoireStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
              <Input type="number" min={0} max={100} value={item.masteryPercent} onChange={(event) => update(item.repertoireItemId, { masteryPercent: Number(event.target.value) })} placeholder={c.mastery} />
              <Input value={item.currentFocusSection} onChange={(event) => update(item.repertoireItemId, { currentFocusSection: event.target.value })} placeholder={c.section} />
              <Input type="number" value={item.currentTempo} onChange={(event) => update(item.repertoireItemId, { currentTempo: event.target.value })} placeholder={c.currentTempo} />
              <Input type="number" value={item.targetTempo} onChange={(event) => update(item.repertoireItemId, { targetTempo: event.target.value })} placeholder={c.targetTempo} />
              <Input value={item.teacherNotes} onChange={(event) => update(item.repertoireItemId, { teacherNotes: event.target.value })} placeholder={c.teacherNotes} />
              <Input value={item.studentVisibleNotes} onChange={(event) => update(item.repertoireItemId, { studentVisibleNotes: event.target.value })} placeholder={c.studentNotes} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={newItem.enabled} onChange={(event) => setNewItem({ ...newItem, enabled: event.target.checked })} /> {c.addSong}</label>
        {newItem.enabled ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Input value={newItem.title} onChange={(event) => setNewItem({ ...newItem, title: event.target.value })} placeholder={c.titleField} />
            <Input value={newItem.composerOrArtist} onChange={(event) => setNewItem({ ...newItem, composerOrArtist: event.target.value })} placeholder={c.artist} />
            <Input value={newItem.instrument} onChange={(event) => setNewItem({ ...newItem, instrument: event.target.value })} placeholder={c.instrument} />
            <Input value={newItem.level} onChange={(event) => setNewItem({ ...newItem, level: event.target.value })} placeholder={c.level} />
            <select className={selectClass} value={newItem.status} onChange={(event) => setNewItem({ ...newItem, status: event.target.value as RepertoireStatus })}>{repertoireStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <Input type="number" min={0} max={100} value={newItem.masteryPercent} onChange={(event) => setNewItem({ ...newItem, masteryPercent: Number(event.target.value) })} placeholder={c.mastery} />
            <Input value={newItem.currentFocusSection} onChange={(event) => setNewItem({ ...newItem, currentFocusSection: event.target.value })} placeholder={c.section} />
            <Input type="number" value={newItem.currentTempo} onChange={(event) => setNewItem({ ...newItem, currentTempo: event.target.value })} placeholder={c.currentTempo} />
            <Input type="number" value={newItem.targetTempo} onChange={(event) => setNewItem({ ...newItem, targetTempo: event.target.value })} placeholder={c.targetTempo} />
            <Input value={newItem.teacherNotes} onChange={(event) => setNewItem({ ...newItem, teacherNotes: event.target.value })} placeholder={c.teacherNotes} />
            <Input value={newItem.studentVisibleNotes} onChange={(event) => setNewItem({ ...newItem, studentVisibleNotes: event.target.value })} placeholder={c.studentNotes} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PracticeStep({ c, assignments, setAssignments, skills, repertoire, existingAssignments }: { c: ReturnType<typeof copy>; assignments: AssignmentState[]; setAssignments: (assignments: AssignmentState[]) => void; skills: SkillOption[]; repertoire: RepertoireOption[]; existingAssignments: Array<{ id: string; title: string; requiresVideo: boolean }> }) {
  function update(id: string, patch: Partial<AssignmentState>) {
    setAssignments(assignments.map((assignment) => assignment.id === id ? { ...assignment, ...patch } : assignment));
  }
  return (
    <div className="space-y-4">
      {existingAssignments.length ? (
        <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{c.existingAssignments}</p>
          <div className="mt-2 flex flex-wrap gap-2">{existingAssignments.map((assignment) => <Badge key={assignment.id} variant={assignment.requiresVideo ? "gold" : "default"}>{assignment.title}</Badge>)}</div>
        </div>
      ) : null}
      {assignments.map((assignment, index) => (
        <div key={assignment.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{c.practice} {index + 1}</p>
            {assignments.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => setAssignments(assignments.filter((item) => item.id !== assignment.id))}>{c.removeAssignment}</Button> : null}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Input value={assignment.title} onChange={(event) => update(assignment.id, { title: event.target.value })} placeholder={c.assignmentTitle} />
            <Input type="date" value={assignment.dueDate} onChange={(event) => update(assignment.id, { dueDate: event.target.value })} aria-label={c.dueDate} />
            <Input type="number" min={1} max={600} value={assignment.expectedMinutes} onChange={(event) => update(assignment.id, { expectedMinutes: event.target.value })} placeholder={c.expectedMinutes} />
            <select className={selectClass} value={assignment.repertoireItemId} onChange={(event) => update(assignment.id, { repertoireItemId: event.target.value })}><option value="">{c.relatedSong}</option>{repertoire.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <select className={selectClass} value={assignment.skillCategoryId} onChange={(event) => update(assignment.id, { skillCategoryId: event.target.value })}><option value="">{c.relatedSkill}</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.instrument} · {skill.name}</option>)}</select>
            <label className="flex h-[3.35rem] items-center gap-2 rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm"><input type="checkbox" checked={assignment.requiresVideo} onChange={(event) => update(assignment.id, { requiresVideo: event.target.checked })} /> {c.requiresVideo}</label>
            <Textarea className="md:col-span-2" value={assignment.instructions} onChange={(event) => update(assignment.id, { instructions: event.target.value })} placeholder={c.assignmentInstructions} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => setAssignments([...assignments, newAssignment()])}>{c.addAssignment}</Button>
    </div>
  );
}

function ReviewStep({ c, locale, status, summary, ratings, skills, repertoire, assignments, videoRequested, notifyStudent, setNotifyStudent }: { c: ReturnType<typeof copy>; locale: AppLocale; status: CompletionStatus; summary: string; ratings: SkillRatingState[]; skills: SkillOption[]; repertoire: RepertoireUpdateState[]; assignments: AssignmentState[]; videoRequested: boolean; notifyStudent: boolean; setNotifyStudent: (value: boolean) => void }) {
  return (
    <div className="space-y-4">
      <CardDescription>{c.doneIntro}</CardDescription>
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryBlock label={c.status} value={statusLabel(status, locale)} />
        <SummaryBlock label={c.summary} value={summary || "-"} />
        <SummaryBlock label={c.skills} value={ratings.length ? ratings.map((rating) => `${skills.find((skill) => skill.id === rating.skillCategoryId)?.name ?? "Skill"}: ${rating.rating}/5`).join(" · ") : "-"} />
        <SummaryBlock label={c.repertoire} value={repertoire.length ? `${repertoire.length}` : "-"} />
        <SummaryBlock label={c.practice} value={assignments.length ? assignments.map((assignment) => assignment.title).join(" · ") : c.noAssignment} />
        <SummaryBlock label={c.requiresVideo} value={videoRequested ? (locale === "es" ? "Sí" : "Yes") : "No"} />
      </div>
      <label className="flex items-center gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/74 px-4 py-3 text-sm"><input type="checkbox" checked={notifyStudent} onChange={(event) => setNotifyStudent(event.target.checked)} /> {c.notify}</label>
    </div>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-1 text-sm text-[var(--color-ink)]">{value}</p></div>;
}

function RatingInput({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  return <Input type="number" min={1} max={5} value={value ?? ""} onChange={(event) => onChange(numberOrUndefined(event.target.value))} placeholder={`${label} 1-5`} />;
}

function buildInitialSkillRatings(skills: SkillOption[], existing: Array<{ skillCategoryId: string; rating: number; note?: string | null }>) {
  return skills.map((skill) => {
    const rating = existing.find((item) => item.skillCategoryId === skill.id);
    return { skillCategoryId: skill.id, rating: rating?.rating ?? 0, note: rating?.note ?? "" };
  });
}

function toRepertoireUpdate(item: RepertoireOption): RepertoireUpdateState {
  return {
    repertoireItemId: item.id,
    title: item.title,
    selected: false,
    status: item.status,
    masteryPercent: item.masteryPercent,
    currentFocusSection: item.currentFocusSection ?? "",
    currentTempo: item.currentTempo ? String(item.currentTempo) : "",
    targetTempo: item.targetTempo ? String(item.targetTempo) : "",
    teacherNotes: item.teacherNotes ?? "",
    studentVisibleNotes: item.studentVisibleNotes ?? "",
  };
}

function newAssignment(): AssignmentState {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  return { id: crypto.randomUUID(), title: "", instructions: "", dueDate: dueDate.toISOString().slice(0, 10), expectedMinutes: "15", repertoireItemId: "", skillCategoryId: "", requiresVideo: false };
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function statusLabel(status: CompletionStatus, locale: AppLocale) {
  const option = statusOptions.find((item) => item.value === status);
  return option ? (locale === "es" ? option.es : option.en) : status;
}

function inferLessonInstrument(value?: string | null): LessonInstrument {
  const normalized = (value ?? "").toLocaleLowerCase();
  if (normalized.includes("voz") || normalized.includes("vocal") || normalized.includes("canto") || normalized.includes("sing") || normalized.includes("voice")) {
    return "VOICE";
  }
  return "PIANO";
}

function filterSkillsForLesson(skills: SkillOption[], lessonInstrument: LessonInstrument) {
  return skills.filter((skill) => skill.instrument === "GENERAL" || skill.instrument === lessonInstrument);
}

function lessonInstrumentLabel(value: LessonInstrument, locale: AppLocale) {
  if (value === "VOICE") return locale === "es" ? "Canto / técnica vocal" : "Singing / vocal technique";
  return "Piano";
}
