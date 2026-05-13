"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";

function copy(locale: AppLocale) {
  return locale === "es"
    ? {
        month: "Mes",
        customStart: "Inicio personalizado",
        customEnd: "Fin personalizado",
        regenerate: "Regenerar si ya existe",
        generate: "Generar reporte",
        generating: "Generando...",
        saved: "Guardado correctamente.",
        error: "No se pudo completar la acción.",
        duplicate: "Ya existe un reporte para este período. Abriendo reporte existente...",
        teacherSummary: "Resumen del profesor",
        strengths: "Fortalezas",
        improvementAreas: "Áreas a mejorar",
        recommendedNextFocus: "Enfoque recomendado",
        studentVisibleSummary: "Resumen visible para estudiante/padre",
        adminNote: "Nota administrativa interna",
        saveDraft: "Guardar cambios",
        publish: "Publicar reporte",
        archive: "Archivar reporte",
        recalculate: "Recalcular datos",
        confirmArchive: "¿Archivar este reporte? El estudiante dejará de verlo.",
      }
    : {
        month: "Month",
        customStart: "Custom start",
        customEnd: "Custom end",
        regenerate: "Regenerate if it already exists",
        generate: "Generate report",
        generating: "Generating...",
        saved: "Saved successfully.",
        error: "Could not complete the action.",
        duplicate: "A report already exists for this period. Opening existing report...",
        teacherSummary: "Teacher summary",
        strengths: "Strengths",
        improvementAreas: "Improvement areas",
        recommendedNextFocus: "Recommended focus",
        studentVisibleSummary: "Student/parent visible summary",
        adminNote: "Internal admin note",
        saveDraft: "Save changes",
        publish: "Publish report",
        archive: "Archive report",
        recalculate: "Recalculate data",
        confirmArchive: "Archive this report? The student will no longer see it.",
      };
}

export function GenerateReportForm({
  studentId,
  teacherId,
  defaultMonth,
  locale,
  destination,
}: {
  studentId: string;
  teacherId?: string | null;
  defaultMonth: string;
  locale: AppLocale;
  destination: "teacher" | "admin";
}) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");
    const payload: Record<string, unknown> = {
      studentId,
      teacherId: teacherId ?? undefined,
      month: String(formData.get("month") ?? defaultMonth),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      regenerate: formData.get("regenerate") === "on",
    };
    if (startDate && endDate) {
      payload.startDate = new Date(`${startDate}T00:00:00`).toISOString();
      payload.endDate = new Date(`${endDate}T23:59:59.999`).toISOString();
      delete payload.month;
    }

    const response = await fetch("/api/progress/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = (await response.json().catch(() => null)) as { report?: { id: string }; existingReportId?: string; error?: string } | null;
    setPending(false);

    if (response.status === 409 && result?.existingReportId) {
      setMessage(c.duplicate);
      router.push(reportPath(destination, result.existingReportId));
      return;
    }

    if (!response.ok || !result?.report?.id) {
      setMessage(result?.error ?? c.error);
      return;
    }

    router.push(reportPath(destination, result.report.id));
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4 md:grid-cols-2">
      <Input name="month" type="month" defaultValue={defaultMonth} aria-label={c.month} />
      <label className="flex items-center gap-2 rounded-[1rem] border border-[var(--color-border)] bg-white/70 px-3 py-2 text-sm text-[var(--color-ink-soft)]">
        <input name="regenerate" type="checkbox" className="h-4 w-4 accent-[var(--color-gold)]" />
        {c.regenerate}
      </label>
      <Input name="startDate" type="date" aria-label={c.customStart} placeholder={c.customStart} />
      <Input name="endDate" type="date" aria-label={c.customEnd} placeholder={c.customEnd} />
      <Button type="submit" variant="gold" disabled={pending} className="md:col-span-2">{pending ? c.generating : c.generate}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)] md:col-span-2">{message}</p> : null}
    </form>
  );
}

export function ReportNarrativeForm({
  reportId,
  locale,
  canEditAdminNote = false,
  initial,
}: {
  reportId: string;
  locale: AppLocale;
  canEditAdminNote?: boolean;
  initial: {
    teacherSummary?: string | null;
    strengths?: string | null;
    improvementAreas?: string | null;
    recommendedNextFocus?: string | null;
    studentVisibleSummary?: string | null;
    adminNote?: string | null;
  };
}) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const payload = {
      teacherSummary: String(formData.get("teacherSummary") ?? ""),
      strengths: String(formData.get("strengths") ?? ""),
      improvementAreas: String(formData.get("improvementAreas") ?? ""),
      recommendedNextFocus: String(formData.get("recommendedNextFocus") ?? ""),
      studentVisibleSummary: String(formData.get("studentVisibleSummary") ?? ""),
      adminNote: canEditAdminNote ? String(formData.get("adminNote") ?? "") : undefined,
    };
    const response = await fetch(`/api/progress/reports/${reportId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    setMessage(response.ok ? c.saved : result?.error ?? c.error);
    if (response.ok) router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4 md:grid-cols-2">
      <Textarea name="teacherSummary" defaultValue={initial.teacherSummary ?? ""} placeholder={c.teacherSummary} className="md:col-span-2" />
      <Textarea name="strengths" defaultValue={initial.strengths ?? ""} placeholder={c.strengths} />
      <Textarea name="improvementAreas" defaultValue={initial.improvementAreas ?? ""} placeholder={c.improvementAreas} />
      <Textarea name="recommendedNextFocus" defaultValue={initial.recommendedNextFocus ?? ""} placeholder={c.recommendedNextFocus} className="md:col-span-2" />
      <Textarea name="studentVisibleSummary" defaultValue={initial.studentVisibleSummary ?? ""} placeholder={c.studentVisibleSummary} className="md:col-span-2" />
      {canEditAdminNote ? <Textarea name="adminNote" defaultValue={initial.adminNote ?? ""} placeholder={c.adminNote} className="md:col-span-2" /> : null}
      <Button type="submit" variant="gold" disabled={pending} className="md:col-span-2">{pending ? c.generating : c.saveDraft}</Button>
      {message ? <p className="text-xs text-[var(--color-ink-soft)] md:col-span-2">{message}</p> : null}
    </form>
  );
}

export function ReportAdminActions({ report, locale }: { report: { id: string; studentId: string; teacherId?: string | null; startDate: string; endDate: string }; locale: AppLocale }) {
  const router = useRouter();
  const c = copy(locale);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function post(action: "publish" | "archive" | "regenerate") {
    if (action === "archive" && !window.confirm(c.confirmArchive)) return;
    setPending(action);
    setMessage("");
    const response = action === "regenerate"
      ? await fetch("/api/progress/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: report.studentId, teacherId: report.teacherId, startDate: report.startDate, endDate: report.endDate, regenerate: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        })
      : await fetch(`/api/progress/reports/${report.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    setMessage(response.ok ? c.saved : result?.error ?? c.error);
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button type="button" variant="gold" disabled={Boolean(pending)} onClick={() => post("publish")}>{pending === "publish" ? c.generating : c.publish}</Button>
      <Button type="button" variant="outline" disabled={Boolean(pending)} onClick={() => post("regenerate")}>{pending === "regenerate" ? c.generating : c.recalculate}</Button>
      <Button type="button" variant="outline" disabled={Boolean(pending)} onClick={() => post("archive")}>{pending === "archive" ? c.generating : c.archive}</Button>
      {message ? <p className="basis-full text-xs text-[var(--color-ink-soft)]">{message}</p> : null}
    </div>
  );
}

function reportPath(destination: "teacher" | "admin", reportId: string) {
  return destination === "admin" ? `/admin/progress/reports/${reportId}` : `/teacher/progress/reports/${reportId}`;
}
