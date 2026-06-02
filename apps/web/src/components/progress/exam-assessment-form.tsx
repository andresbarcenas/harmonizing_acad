"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RepertoireStatus, StudentExamArea } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { displayInstrument } from "@/components/instrument-select";
import { ExamPublishButton } from "@/components/progress/exam-publish-button";
import type { AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type RepertoireOption = {
  id: string;
  title: string;
  composerOrArtist?: string | null;
  status?: string | null;
  masteryPercent?: number | null;
};

type StudentOption = {
  id: string;
  name: string;
  teacherId?: string | null;
  teacherName?: string | null;
  repertoireItems: RepertoireOption[];
};

type TeacherOption = { id: string; name: string };

type CatalogOption = {
  id: string;
  title: string;
  composerOrArtist?: string | null;
  instrument: string;
  tags?: string | null;
};

type ExistingAssessment = {
  id: string;
  studentId: string;
  teacherId: string;
  teacherName: string;
  classSessionId?: string | null;
  examDate: string;
  title: string;
  notes?: string | null;
  publishedAt?: string | null;
  publishedByName?: string | null;
  repertoireScores: Array<{
    id: string;
    repertoireItemId?: string | null;
    titleSnapshot: string;
    composerSnapshot?: string | null;
    interpretationScore: number;
    executionScore: number;
    overallScore: number;
    comments?: string | null;
  }>;
  areaScores: Array<{
    id: string;
    area: StudentExamArea;
    topic: string;
    objective: string;
    score: number;
    comments?: string | null;
  }>;
};

type RepertoireRow = {
  key: string;
  repertoireItemId: string;
  catalogItemId: string;
  title: string;
  composerOrArtist: string;
  status: RepertoireStatus;
  interpretationScore: string;
  executionScore: string;
  overallScore: string;
  comments: string;
  catalogQuery: string;
  catalogResults: CatalogOption[];
  catalogMessage: string;
  searching: boolean;
};

type AreaRow = {
  key: string;
  topic: string;
  objective: string;
  score: string;
  comments: string;
};

type Step = "repertoire" | "harmony" | "reading" | "review";

const repertoireStatuses = ["ASSIGNED", "LEARNING", "IMPROVING", "PERFORMANCE_READY", "COMPLETED", "PAUSED"] as const;
const DEFAULT_EXAM_SCORE = "5";

function copy(locale: AppLocale) {
  return locale === "es"
    ? {
        title: "Evaluaciones de examen",
        description: "Registra repertorio, armonía y lectura musical desde exámenes históricos o clases de evaluación.",
        addHistorical: "Agregar examen histórico",
        updateAssessment: "Actualizar evaluación",
        completeExam: "Completar evaluación",
        saved: "Evaluación guardada correctamente.",
        error: "No se pudo guardar la evaluación.",
        student: "Estudiante",
        teacher: "Docente",
        examTitle: "Título del examen",
        examDate: "Fecha del examen",
        notes: "Notas generales internas",
        repertoire: "Repertorio",
        harmony: "Armonía",
        reading: "Lectura musical",
        review: "Revisión",
        existingSong: "Canción existente",
        chooseSong: "Seleccionar repertorio existente",
        titleField: "Título de la canción",
        composer: "Compositor o artista",
        status: "Estado después del examen",
        interpretation: "Interpretación",
        execution: "Ejecución",
        overall: "General",
        comments: "Comentarios",
        addSong: "Agregar canción",
        remove: "Quitar",
        catalogSearch: "Buscar catálogo",
        search: "Buscar",
        useSong: "Usar canción",
        selectedCatalog: "Catálogo seleccionado",
        noCatalogResults: "Sin resultados de catálogo.",
        topic: "Tema",
        objective: "Objetivo",
        score: "Puntaje",
        addHarmony: "Agregar fila de armonía",
        addReading: "Agregar fila de lectura",
        recent: "Evaluaciones recientes",
        noAssessments: "Aún no hay evaluaciones registradas.",
        edit: "Editar",
        newAssessment: "Nueva evaluación",
        next: "Siguiente",
        back: "Atrás",
        submit: "Guardar evaluación",
        summary: "Resumen",
        internalOnly: "Visible solo para docentes y administración en esta versión.",
        classLinked: "Esta evaluación cerrará la clase como completada.",
        published: "Publicada",
        unpublished: "No publicada",
        publishedBy: "Publicada por",
        repertoireStatusLabels: {
          ASSIGNED: "Asignada",
          LEARNING: "Aprendiendo",
          IMPROVING: "Mejorando",
          PERFORMANCE_READY: "Lista para presentar",
          COMPLETED: "Completada",
          PAUSED: "Pausada",
        } satisfies Record<RepertoireStatus, string>,
      }
    : {
        title: "Exam assessments",
        description: "Capture repertoire, harmony, and music reading from historical exams or evaluation classes.",
        addHistorical: "Add historical exam",
        updateAssessment: "Update assessment",
        completeExam: "Complete exam",
        saved: "Assessment saved successfully.",
        error: "Could not save assessment.",
        student: "Student",
        teacher: "Teacher",
        examTitle: "Exam title",
        examDate: "Exam date",
        notes: "Internal general notes",
        repertoire: "Repertoire",
        harmony: "Harmony",
        reading: "Music reading",
        review: "Review",
        existingSong: "Existing song",
        chooseSong: "Select existing repertoire",
        titleField: "Song title",
        composer: "Composer or artist",
        status: "Status after exam",
        interpretation: "Interpretation",
        execution: "Execution",
        overall: "Overall",
        comments: "Comments",
        addSong: "Add song",
        remove: "Remove",
        catalogSearch: "Search catalog",
        search: "Search",
        useSong: "Use song",
        selectedCatalog: "Catalog selected",
        noCatalogResults: "No catalog results.",
        topic: "Topic",
        objective: "Objective",
        score: "Score",
        addHarmony: "Add harmony row",
        addReading: "Add reading row",
        recent: "Recent assessments",
        noAssessments: "No assessments recorded yet.",
        edit: "Edit",
        newAssessment: "New assessment",
        next: "Next",
        back: "Back",
        submit: "Save assessment",
        summary: "Summary",
        internalOnly: "Visible only to teachers and admins in this version.",
        classLinked: "This assessment will close the class as completed.",
        published: "Published",
        unpublished: "Unpublished",
        publishedBy: "Published by",
        repertoireStatusLabels: {
          ASSIGNED: "Assigned",
          LEARNING: "Learning",
          IMPROVING: "Improving",
          PERFORMANCE_READY: "Performance ready",
          COMPLETED: "Completed",
          PAUSED: "Paused",
        } satisfies Record<RepertoireStatus, string>,
      };
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function emptyRepertoireRow(): RepertoireRow {
  return {
    key: newKey(),
    repertoireItemId: "",
    catalogItemId: "",
    title: "",
    composerOrArtist: "",
    status: RepertoireStatus.PERFORMANCE_READY,
    interpretationScore: DEFAULT_EXAM_SCORE,
    executionScore: DEFAULT_EXAM_SCORE,
    overallScore: DEFAULT_EXAM_SCORE,
    comments: "",
    catalogQuery: "",
    catalogResults: [],
    catalogMessage: "",
    searching: false,
  };
}

function emptyAreaRow(): AreaRow {
  return { key: newKey(), topic: "", objective: "", score: DEFAULT_EXAM_SCORE, comments: "" };
}

export function ExamAssessmentForm({
  locale,
  studentOptions,
  teacherOptions = [],
  initialStudentId,
  initialTeacherId,
  lockedStudent = false,
  classSessionId,
  classDateLabel,
  existingAssessments = [],
  stepMode = false,
  returnHref,
}: {
  locale: AppLocale;
  studentOptions: StudentOption[];
  teacherOptions?: TeacherOption[];
  initialStudentId?: string;
  initialTeacherId?: string | null;
  lockedStudent?: boolean;
  classSessionId?: string;
  classDateLabel?: string;
  existingAssessments?: ExistingAssessment[];
  stepMode?: boolean;
  returnHref?: string;
}) {
  const router = useRouter();
  const c = copy(locale);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("repertoire");
  const [studentId, setStudentId] = useState(initialStudentId ?? studentOptions[0]?.id ?? "");
  const selectedStudent = useMemo(() => studentOptions.find((student) => student.id === studentId) ?? studentOptions[0], [studentId, studentOptions]);
  const [teacherId, setTeacherId] = useState(initialTeacherId ?? selectedStudent?.teacherId ?? teacherOptions[0]?.id ?? "");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [examTitle, setExamTitle] = useState(classSessionId ? (locale === "es" ? "Examen de piano" : "Piano exam") : "");
  const [notes, setNotes] = useState("");
  const [repertoireRows, setRepertoireRows] = useState<RepertoireRow[]>(() => [emptyRepertoireRow()]);
  const [harmonyRows, setHarmonyRows] = useState<AreaRow[]>(() => [emptyAreaRow()]);
  const [readingRows, setReadingRows] = useState<AreaRow[]>(() => [emptyAreaRow()]);

  function chooseStudent(nextStudentId: string) {
    const nextStudent = studentOptions.find((student) => student.id === nextStudentId);
    setStudentId(nextStudentId);
    if (nextStudent?.teacherId) setTeacherId(nextStudent.teacherId);
    setRepertoireRows([emptyRepertoireRow()]);
    setEditingId(null);
  }

  function loadAssessment(assessment: ExistingAssessment) {
    setEditingId(assessment.id);
    setStudentId(assessment.studentId);
    setTeacherId(assessment.teacherId);
    setExamDate(assessment.examDate.slice(0, 10));
    setExamTitle(assessment.title);
    setNotes(assessment.notes ?? "");
    setRepertoireRows(assessment.repertoireScores.map((row) => ({
      ...emptyRepertoireRow(),
      key: row.id,
      repertoireItemId: row.repertoireItemId ?? "",
      title: row.titleSnapshot,
      composerOrArtist: row.composerSnapshot ?? "",
      interpretationScore: String(row.interpretationScore),
      executionScore: String(row.executionScore),
      overallScore: String(row.overallScore),
      comments: row.comments ?? "",
    })));
    setHarmonyRows(assessment.areaScores.filter((row) => row.area === StudentExamArea.HARMONY).map(toAreaRow));
    setReadingRows(assessment.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING).map(toAreaRow));
    setStep("repertoire");
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setExamDate(new Date().toISOString().slice(0, 10));
    setExamTitle(classSessionId ? (locale === "es" ? "Examen de piano" : "Piano exam") : "");
    setNotes("");
    setRepertoireRows([emptyRepertoireRow()]);
    setHarmonyRows([emptyAreaRow()]);
    setReadingRows([emptyAreaRow()]);
    setStep("repertoire");
    setMessage("");
  }

  async function searchCatalog(rowKey: string) {
    const row = repertoireRows.find((item) => item.key === rowKey);
    if (!row) return;
    setRepertoireRows((rows) => rows.map((item) => item.key === rowKey ? { ...item, searching: true, catalogMessage: "" } : item));
    const params = new URLSearchParams();
    if (row.catalogQuery.trim()) params.set("query", row.catalogQuery.trim());
    params.set("instrument", "Piano");
    params.set("limit", "8");
    const response = await fetch(`/api/repertoire/catalog?${params.toString()}`);
    const payload = await response.json().catch(() => null) as { items?: CatalogOption[]; error?: string } | null;
    setRepertoireRows((rows) => rows.map((item) => item.key === rowKey
      ? {
          ...item,
          searching: false,
          catalogResults: response.ok && payload?.items ? payload.items : [],
          catalogMessage: response.ok && payload?.items?.length ? "" : payload?.error ?? c.noCatalogResults,
        }
      : item));
  }

  async function submit() {
    setMessage("");
    const body = {
      studentId,
      teacherId: teacherId || undefined,
      classSessionId,
      examDate: new Date(`${examDate}T12:00:00.000Z`).toISOString(),
      title: examTitle.trim() || (locale === "es" ? "Examen de piano" : "Piano exam"),
      notes: notes.trim() || undefined,
      repertoireScores: repertoireRows.map((row) => ({
        repertoireItemId: row.repertoireItemId || undefined,
        catalogItemId: row.catalogItemId || undefined,
        title: row.repertoireItemId || row.catalogItemId ? undefined : row.title.trim() || undefined,
        composerOrArtist: row.repertoireItemId || row.catalogItemId ? undefined : row.composerOrArtist.trim() || undefined,
        status: row.status,
        interpretationScore: Number(row.interpretationScore),
        executionScore: Number(row.executionScore),
        overallScore: Number(row.overallScore),
        comments: row.comments.trim() || undefined,
      })),
      harmonyScores: cleanAreaRows(harmonyRows),
      musicReadingScores: cleanAreaRows(readingRows),
    };

    const endpoint = editingId ? `/api/progress/exam-assessments/${editingId}` : "/api/progress/exam-assessments";
    const response = await fetch(endpoint, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null) as { error?: string; assessment?: { id: string } } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? c.error);
      return;
    }
    setMessage(c.saved);
    setEditingId(payload?.assessment?.id ?? editingId);
    startTransition(() => {
      if (returnHref) router.push(returnHref);
      router.refresh();
    });
  }

  const visibleContent = !stepMode || step === "repertoire"
    ? <RepertoireSection c={c} locale={locale} rows={repertoireRows} setRows={setRepertoireRows} repertoireOptions={selectedStudent?.repertoireItems ?? []} onSearchCatalog={searchCatalog} />
    : step === "harmony"
      ? <AreaSection title={c.harmony} addLabel={c.addHarmony} c={c} rows={harmonyRows} setRows={setHarmonyRows} />
      : step === "reading"
        ? <AreaSection title={c.reading} addLabel={c.addReading} c={c} rows={readingRows} setRows={setReadingRows} />
        : <ReviewSection c={c} repertoireRows={repertoireRows} harmonyRows={harmonyRows} readingRows={readingRows} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{stepMode ? c.completeExam : c.title}</CardTitle>
          <CardDescription>{stepMode ? c.classLinked : c.description}</CardDescription>
        </div>
        <Badge variant="gold">{c.internalOnly}</Badge>
      </div>

      {existingAssessments.length && !stepMode ? (
        <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{c.recent}</p>
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{c.newAssessment}</Button>
          </div>
          <div className="mt-3 grid gap-2">
            {existingAssessments.map((assessment) => (
              <div key={assessment.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-control)] p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{assessment.title}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(assessment.examDate, locale)} · {assessment.teacherName} · {assessment.repertoireScores.length} {c.repertoire.toLowerCase()}</p>
                    {assessment.publishedAt ? (
                      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                        {c.publishedBy}: {assessment.publishedByName ?? "-"} · {formatDate(assessment.publishedAt, locale)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={assessment.publishedAt ? "success" : "default"}>{assessment.publishedAt ? c.published : c.unpublished}</Badge>
                    <a href={`/api/progress/exam-assessments/${assessment.id}/pdf`} target="_blank" rel="noreferrer">
                      <Button type="button" size="sm" variant="outline">PDF</Button>
                    </a>
                    <ExamPublishButton assessmentId={assessment.id} published={Boolean(assessment.publishedAt)} locale={locale} />
                    <Button type="button" size="sm" variant="outline" disabled={Boolean(assessment.publishedAt)} onClick={() => loadAssessment(assessment)}>{c.edit}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !existingAssessments.length && !stepMode ? <CardDescription>{c.noAssessments}</CardDescription> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {lockedStudent ? (
          <Info label={c.student} value={selectedStudent?.name ?? "-"} />
        ) : (
          <label className="grid gap-1 text-sm font-semibold text-[var(--color-ink)]">
            {c.student}
            <select className={selectClassName} value={studentId} onChange={(event) => chooseStudent(event.target.value)}>
              {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
        )}
        {teacherOptions.length ? (
          <label className="grid gap-1 text-sm font-semibold text-[var(--color-ink)]">
            {c.teacher}
            <select className={selectClassName} value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">{c.teacher}</option>
              {teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          </label>
        ) : <Info label={c.teacher} value={selectedStudent?.teacherName ?? "-"} />}
        <Input value={examTitle} onChange={(event) => setExamTitle(event.target.value)} placeholder={c.examTitle} aria-label={c.examTitle} />
        <Input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} aria-label={c.examDate} />
        {classDateLabel ? <Info label={c.examDate} value={classDateLabel} /> : null}
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={c.notes} aria-label={c.notes} className="md:col-span-2" />
      </div>

      {stepMode ? <StepNav c={c} step={step} setStep={setStep} /> : null}

      {stepMode ? visibleContent : (
        <div className="space-y-5">
          <RepertoireSection c={c} locale={locale} rows={repertoireRows} setRows={setRepertoireRows} repertoireOptions={selectedStudent?.repertoireItems ?? []} onSearchCatalog={searchCatalog} />
          <AreaSection title={c.harmony} addLabel={c.addHarmony} c={c} rows={harmonyRows} setRows={setHarmonyRows} />
          <AreaSection title={c.reading} addLabel={c.addReading} c={c} rows={readingRows} setRows={setReadingRows} />
          <ReviewSection c={c} repertoireRows={repertoireRows} harmonyRows={harmonyRows} readingRows={readingRows} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {stepMode && step !== "repertoire" ? <Button type="button" variant="outline" onClick={() => setStep(previousStep(step))}>{c.back}</Button> : null}
        {stepMode && step !== "review" ? <Button type="button" variant="gold" onClick={() => setStep(nextStep(step))}>{c.next}</Button> : null}
        {!stepMode || step === "review" ? <Button type="button" variant="gold" disabled={pending} onClick={submit}>{editingId ? c.updateAssessment : c.submit}</Button> : null}
      </div>
      {message ? <p className={cn("text-sm", message === c.saved ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>{message}</p> : null}
    </div>
  );
}

function RepertoireSection({ c, locale, rows, setRows, repertoireOptions, onSearchCatalog }: { c: ReturnType<typeof copy>; locale: AppLocale; rows: RepertoireRow[]; setRows: (rows: RepertoireRow[]) => void; repertoireOptions: RepertoireOption[]; onSearchCatalog: (rowKey: string) => void }) {
  function update(rowKey: string, patch: Partial<RepertoireRow>) {
    setRows(rows.map((row) => row.key === rowKey ? { ...row, ...patch } : row));
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{c.repertoire}</p>
          <p className="text-xs text-[var(--color-ink-soft)]">{c.interpretation} · {c.execution} · {c.overall}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, emptyRepertoireRow()])}>{c.addSong}</Button>
      </div>
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="gold">{c.repertoire} {index + 1}</Badge>
            {rows.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => setRows(rows.filter((item) => item.key !== row.key))}>{c.remove}</Button> : null}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <select className={selectClassName} value={row.repertoireItemId} onChange={(event) => {
              const option = repertoireOptions.find((item) => item.id === event.target.value);
              update(row.key, {
                repertoireItemId: event.target.value,
                catalogItemId: "",
                title: option?.title ?? row.title,
                composerOrArtist: option?.composerOrArtist ?? "",
              });
            }}>
              <option value="">{c.chooseSong}</option>
              {repertoireOptions.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.masteryPercent ?? 0}%</option>)}
            </select>
            <select className={selectClassName} value={row.status} onChange={(event) => update(row.key, { status: event.target.value as RepertoireStatus })} aria-label={c.status}>
              {repertoireStatuses.map((status) => <option key={status} value={status}>{c.repertoireStatusLabels[status]}</option>)}
            </select>
            <Input value={row.title} onChange={(event) => update(row.key, { title: event.target.value, repertoireItemId: "", catalogItemId: "" })} placeholder={c.titleField} />
            <Input value={row.composerOrArtist} onChange={(event) => update(row.key, { composerOrArtist: event.target.value })} placeholder={c.composer} />
            <ScoreInput label={c.interpretation} value={row.interpretationScore} onChange={(value) => update(row.key, { interpretationScore: value })} />
            <ScoreInput label={c.execution} value={row.executionScore} onChange={(value) => update(row.key, { executionScore: value })} />
            <ScoreInput label={c.overall} value={row.overallScore} onChange={(value) => update(row.key, { overallScore: value })} />
            <Textarea value={row.comments} onChange={(event) => update(row.key, { comments: event.target.value })} placeholder={c.comments} className="md:col-span-2" />
          </div>
          <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{c.catalogSearch}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input value={row.catalogQuery} onChange={(event) => update(row.key, { catalogQuery: event.target.value })} placeholder={c.catalogSearch} />
              <Button type="button" variant="outline" disabled={row.searching} onClick={() => onSearchCatalog(row.key)}>{row.searching ? "..." : c.search}</Button>
            </div>
            {row.catalogMessage ? <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{row.catalogMessage}</p> : null}
            {row.catalogItemId ? <Badge className="mt-2" variant="gold">{c.selectedCatalog}</Badge> : null}
            {row.catalogResults.length ? (
              <div className="mt-3 grid gap-2">
                {row.catalogResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => update(row.key, { catalogItemId: item.id, repertoireItemId: "", title: item.title, composerOrArtist: item.composerOrArtist ?? "", catalogResults: [], catalogQuery: item.title })}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-control)] p-3 text-left transition hover:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    <span className="block text-sm font-semibold text-[var(--color-ink)]">{item.title}</span>
                    <span className="block text-xs text-[var(--color-ink-soft)]">{[item.composerOrArtist, displayInstrument(item.instrument, locale), item.tags].filter(Boolean).join(" · ")}</span>
                    <span className="mt-2 inline-block text-xs font-semibold text-[var(--color-gold-deep)]">{c.useSong}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}

function AreaSection({ title, addLabel, c, rows, setRows }: { title: string; addLabel: string; c: ReturnType<typeof copy>; rows: AreaRow[]; setRows: (rows: AreaRow[]) => void }) {
  function update(rowKey: string, patch: Partial<AreaRow>) {
    setRows(rows.map((row) => row.key === rowKey ? { ...row, ...patch } : row));
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, emptyAreaRow()])}>{addLabel}</Button>
      </div>
      {rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-4 md:grid-cols-2">
          <div className="flex items-center justify-between gap-2 md:col-span-2">
            <Badge>{title} {index + 1}</Badge>
            {rows.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => setRows(rows.filter((item) => item.key !== row.key))}>{c.remove}</Button> : null}
          </div>
          <Input value={row.topic} onChange={(event) => update(row.key, { topic: event.target.value })} placeholder={c.topic} />
          <ScoreInput label={c.score} value={row.score} onChange={(value) => update(row.key, { score: value })} />
          <Textarea value={row.objective} onChange={(event) => update(row.key, { objective: event.target.value })} placeholder={c.objective} />
          <Textarea value={row.comments} onChange={(event) => update(row.key, { comments: event.target.value })} placeholder={c.comments} />
        </div>
      ))}
    </section>
  );
}

function ReviewSection({ c, repertoireRows, harmonyRows, readingRows }: { c: ReturnType<typeof copy>; repertoireRows: RepertoireRow[]; harmonyRows: AreaRow[]; readingRows: AreaRow[] }) {
  const scoredSongs = repertoireRows.filter((row) => row.title || row.repertoireItemId || row.catalogItemId).length;
  return (
    <section className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">{c.summary}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Info label={c.repertoire} value={String(scoredSongs)} />
        <Info label={c.harmony} value={String(cleanAreaRows(harmonyRows).length)} />
        <Info label={c.reading} value={String(cleanAreaRows(readingRows).length)} />
      </div>
    </section>
  );
}

function StepNav({ c, step, setStep }: { c: ReturnType<typeof copy>; step: Step; setStep: (step: Step) => void }) {
  const steps: Array<{ value: Step; label: string }> = [
    { value: "repertoire", label: c.repertoire },
    { value: "harmony", label: c.harmony },
    { value: "reading", label: c.reading },
    { value: "review", label: c.review },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {steps.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => setStep(item.value)}
          className={cn(
            "rounded-full border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
            step === item.value ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]" : "border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-ink-soft)] hover:border-[var(--color-gold)]",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const numericValue = normalizeScoreValue(value);
  return (
    <label className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-control)] p-3 shadow-[var(--shadow-control-inset)]">
      <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--color-ink)]">
        <span>{label}</span>
        <Badge variant="gold">{formatScoreLabel(numericValue)}/10</Badge>
      </span>
      <input
        className="mt-3 w-full accent-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        type="range"
        min={1}
        max={10}
        step={0.5}
        value={numericValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} 1-10`}
      />
      <span className="mt-1 flex justify-between text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </span>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-control)] p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold-deep)]">{label}</p><p className="mt-1 text-sm text-[var(--color-ink)]">{value}</p></div>;
}

function cleanAreaRows(rows: AreaRow[]) {
  return rows
    .filter((row) => row.topic.trim() || row.objective.trim() || row.comments.trim())
    .map((row) => ({ topic: row.topic.trim(), objective: row.objective.trim(), score: normalizeScoreValue(row.score), comments: row.comments.trim() || undefined }));
}

function normalizeScoreValue(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number(DEFAULT_EXAM_SCORE);
  return Math.max(1, Math.min(10, parsed));
}

function formatScoreLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toAreaRow(row: ExistingAssessment["areaScores"][number]): AreaRow {
  return { key: row.id, topic: row.topic, objective: row.objective, score: String(row.score), comments: row.comments ?? "" };
}

function nextStep(step: Step): Step {
  if (step === "repertoire") return "harmony";
  if (step === "harmony") return "reading";
  return "review";
}

function previousStep(step: Step): Step {
  if (step === "review") return "reading";
  if (step === "reading") return "harmony";
  return "repertoire";
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

const selectClassName = "h-[3.05rem] w-full rounded-[1rem] border border-[var(--color-border-strong)] bg-[var(--color-control)] px-3 text-sm text-[var(--color-ink)] shadow-[var(--shadow-control-inset)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]";
