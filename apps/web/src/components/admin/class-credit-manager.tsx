"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { intlLocale, type AppLocale } from "@/lib/i18n";

type StudentOption = {
  id: string;
  name: string;
  email: string;
  teacherName: string | null;
};

type CreditSummary = {
  balance: number;
  entries: Array<{
    id: string;
    type: string;
    delta: number;
    reason: string | null;
    note: string | null;
    effectiveAt: string;
    invoice: { invoiceNumber: string } | null;
    classSession: { startsAtUtc: string; status: string; type: string } | null;
    createdBy: { name: string } | null;
  }>;
};

const copy = {
  en: {
    title: "Class credits",
    description: "Select a student, review their credit ledger, and correct the balance with audit-safe adjustments.",
    search: "Search student by name, email, or teacher",
    chooseStudent: "Choose a student",
    currentBalance: "Current balance",
    negativeWarning: "This student has a negative class-credit balance. Add credits or review recent class outcomes.",
    addAdjustment: "Add adjustment",
    delta: "Credits to add/remove",
    deltaHelp: "Use +2 to add makeup/extra credits or -1 to correct an over-grant.",
    reason: "Reason",
    note: "Internal note",
    save: "Save adjustment",
    saving: "Saving...",
    loading: "Loading credits...",
    recentLedger: "Recent ledger",
    noEntries: "No credit entries yet.",
    success: "Class credit adjustment saved.",
    error: "Could not update class credits.",
    auditHelp: "Ledger entries are historical audit records. To modify the balance, add a positive or negative adjustment instead of editing history.",
    teacher: "Teacher",
    related: "Related",
    createdBy: "Created by",
    invoice: "Invoice",
    classSession: "Class",
    noStudents: "No students match that search.",
  },
  es: {
    title: "Créditos de clase",
    description: "Selecciona un estudiante, revisa su historial de créditos y corrige el balance con ajustes auditables.",
    search: "Buscar estudiante por nombre, email o docente",
    chooseStudent: "Elige un estudiante",
    currentBalance: "Balance actual",
    negativeWarning: "Este estudiante tiene un balance negativo de créditos. Agrega créditos o revisa las clases recientes.",
    addAdjustment: "Agregar ajuste",
    delta: "Créditos a agregar/quitar",
    deltaHelp: "Usa +2 para agregar créditos de reposición/extra o -1 para corregir créditos otorgados de más.",
    reason: "Motivo",
    note: "Nota interna",
    save: "Guardar ajuste",
    saving: "Guardando...",
    loading: "Cargando créditos...",
    recentLedger: "Historial reciente",
    noEntries: "Todavía no hay movimientos de créditos.",
    success: "Ajuste de créditos guardado.",
    error: "No se pudieron actualizar los créditos de clase.",
    auditHelp: "Los movimientos del historial son registros auditables. Para modificar el balance, agrega un ajuste positivo o negativo en vez de editar el historial.",
    teacher: "Docente",
    related: "Relacionado",
    createdBy: "Creado por",
    invoice: "Factura",
    classSession: "Clase",
    noStudents: "No hay estudiantes que coincidan con la búsqueda.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function ClassCreditManager({
  students,
  locale,
}: {
  students: StudentOption[];
  locale: AppLocale;
}) {
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? students.filter((student) => {
          const haystack = `${student.name} ${student.email} ${student.teacherName ?? ""}`.toLowerCase();
          return haystack.includes(normalized);
        })
      : students;
    return matches.slice(0, 80);
  }, [query, students]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  async function loadSummary(studentId: string) {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/students/${studentId}/class-credits`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as (CreditSummary & { error?: string }) | null;
      if (!response.ok) throw new Error(payload?.error ?? t.error);
      setSummary(payload);
    } catch (error) {
      setSummary(null);
      setMessage({ kind: "error", text: error instanceof Error ? error.message : t.error });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedStudentId) {
      setSummary(null);
      return;
    }
    let active = true;
    setLoading(true);
    setMessage(null);
    fetch(`/api/admin/students/${selectedStudentId}/class-credits`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as (CreditSummary & { error?: string }) | null;
        if (!response.ok) throw new Error(payload?.error ?? t.error);
        if (active) setSummary(payload);
      })
      .catch((error) => {
        if (!active) return;
        setSummary(null);
        setMessage({ kind: "error", text: error instanceof Error ? error.message : t.error });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedStudentId, t.error]);

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudentId) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/students/${selectedStudentId}/class-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delta: Number(formData.get("delta")),
          reason: String(formData.get("reason") ?? ""),
          note: String(formData.get("note") ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? t.error);
      form.reset();
      await loadSummary(selectedStudentId);
      setMessage({ kind: "success", text: t.success });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : t.error });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        {summary ? (
          <Badge variant={summary.balance < 0 ? "danger" : "gold"}>
            {t.currentBalance}: {summary.balance}
          </Badge>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(16rem,0.95fr)_minmax(0,1.45fr)]">
        <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4">
          <label className="space-y-2 text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold-deep)]">{t.search}</span>
            <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tomas, piano, maria@example.com" />
          </label>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredStudents.map((student) => {
              const selected = student.id === selectedStudentId;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={[
                    "w-full rounded-[1rem] border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    selected
                      ? "border-[color-mix(in_srgb,var(--color-gold)_46%,var(--color-border))] bg-[var(--color-gold-soft)] text-[var(--color-ink)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-ink-soft)] hover:border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))]",
                  ].join(" ")}
                >
                  <span className="block font-semibold text-[var(--color-ink)]">{student.name}</span>
                  <span className="block truncate text-xs">{student.email}</span>
                  <span className="block truncate text-xs">{t.teacher}: {student.teacherName ?? "-"}</span>
                </button>
              );
            })}
            {!filteredStudents.length ? (
              <p className="rounded-[1rem] border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-ink-soft)]">{t.noStudents}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{selectedStudent?.name ?? t.chooseStudent}</p>
                {selectedStudent ? <p className="text-xs text-[var(--color-ink-soft)]">{selectedStudent.email}</p> : null}
              </div>
              {loading ? <Badge>{t.loading}</Badge> : summary ? <Badge variant={summary.balance < 0 ? "danger" : "gold"}>{summary.balance}</Badge> : null}
            </div>
            {summary?.balance !== undefined && summary.balance < 0 ? <p className="mt-3 text-sm text-[var(--color-danger)]">{t.negativeWarning}</p> : null}
            <p className="mt-3 rounded-[1rem] border border-dashed border-[var(--color-border)] px-3 py-3 text-xs leading-5 text-[var(--color-ink-soft)]">{t.auditHelp}</p>

            <form onSubmit={submitAdjustment} className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[9rem_1fr]">
                <label className="space-y-1 text-left">
                  <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{t.delta}</span>
                  <Input name="delta" type="number" defaultValue="1" min="-100" max="100" required />
                </label>
                <label className="space-y-1 text-left">
                  <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{t.reason}</span>
                  <Input name="reason" placeholder={locale === "es" ? "Corrección manual" : "Manual correction"} maxLength={160} required />
                </label>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">{t.deltaHelp}</p>
              <label className="space-y-1 text-left">
                <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{t.note}</span>
                <Textarea name="note" rows={3} placeholder={locale === "es" ? "Detalle interno opcional" : "Optional internal detail"} />
              </label>
              <Button type="submit" variant="gold" disabled={!selectedStudentId || pending}>
                {pending ? t.saving : t.save}
              </Button>
            </form>

            {message ? (
              <p className={`mt-3 rounded-[1rem] border px-3 py-2 text-sm ${message.kind === "success" ? "border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] text-[var(--color-success)]" : "border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] text-[var(--color-danger)]"}`}>
                {message.text}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{t.recentLedger}</p>
              {summary ? <Badge>{summary.entries.length}</Badge> : null}
            </div>
            <div className="mt-3 space-y-2">
              {summary?.entries.map((entry) => (
                <div key={entry.id} className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--color-ink)]">{entry.delta > 0 ? "+" : ""}{entry.delta} · {entryTypeLabel(entry.type, locale)}</span>
                    <span>{formatDate(entry.effectiveAt, locale)}</span>
                  </div>
                  <p className="mt-1">{entry.reason ?? "-"}</p>
                  {entry.note ? <p className="mt-1 whitespace-pre-line break-words">{entry.note}</p> : null}
                  <p className="mt-1">
                    {t.related}: {relatedLabel(entry, locale, t)}
                    {entry.createdBy?.name ? ` · ${t.createdBy}: ${entry.createdBy.name}` : ""}
                  </p>
                </div>
              ))}
              {!loading && summary && !summary.entries.length ? (
                <p className="rounded-[1rem] border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-ink-soft)]">{t.noEntries}</p>
              ) : null}
              {loading ? <p className="text-sm text-[var(--color-ink-soft)]">{t.loading}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function entryTypeLabel(type: string, locale: AppLocale) {
  const labels: Record<string, { en: string; es: string }> = {
    INVOICE_GRANT: { en: "Invoice grant", es: "Créditos por factura" },
    CLASS_COMPLETED: { en: "Class completed", es: "Clase completada" },
    CLASS_NO_SHOW: { en: "Class no-show", es: "Inasistencia" },
    MANUAL_ADJUSTMENT: { en: "Manual adjustment", es: "Ajuste manual" },
    REVERSAL: { en: "Reversal", es: "Reversión" },
  };
  return labels[type]?.[locale] ?? type.replaceAll("_", " ");
}

function relatedLabel(entry: CreditSummary["entries"][number], locale: AppLocale, t: Record<string, string>) {
  if (entry.invoice?.invoiceNumber) return `${t.invoice} ${entry.invoice.invoiceNumber}`;
  if (entry.classSession?.startsAtUtc) return `${t.classSession} ${formatDate(entry.classSession.startsAtUtc, locale)} · ${entry.classSession.type}`;
  return "-";
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
