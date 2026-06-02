"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { skillInstruments, type SkillInstrument } from "@/lib/skills/default-skills";
import type { AppLocale } from "@/lib/i18n/locales";

type SkillRow = {
  id: string;
  name: string;
  instrument: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  usage: {
    lessonRatings: number;
    practiceAssignments: number;
    practiceLogs: number;
    practiceVideos: number;
    videoSkillRatings: number;
  };
};

type SkillFormState = {
  instrument: SkillInstrument;
  name: string;
  description: string;
  sortOrder: string;
  active: boolean;
};

type FilterValue = "active" | "inactive" | "all";

const emptyForm: SkillFormState = {
  instrument: "PIANO",
  name: "",
  description: "",
  sortOrder: "100",
  active: true,
};

export function SkillManager({ initialSkills, locale }: { initialSkills: SkillRow[]; locale: AppLocale }) {
  const [skills, setSkills] = useState(initialSkills);
  const [form, setForm] = useState<SkillFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("active");
  const [overwriteDefaults, setOverwriteDefaults] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isSpanish = locale === "es";
  const copy = getCopy(isSpanish);

  const filteredSkills = useMemo(() => {
    const filtered = skills.filter((skill) => {
      if (filter === "active") return skill.active;
      if (filter === "inactive") return !skill.active;
      return true;
    });
    return [...filtered].sort((first, second) =>
      first.instrument.localeCompare(second.instrument) ||
      first.sortOrder - second.sortOrder ||
      first.name.localeCompare(second.name),
    );
  }, [filter, skills]);

  const groupedSkills = useMemo(() => {
    return skillInstruments.map((instrument) => ({
      instrument,
      skills: filteredSkills.filter((skill) => skill.instrument === instrument),
    }));
  }, [filteredSkills]);

  const counts = useMemo(() => ({
    total: skills.length,
    active: skills.filter((skill) => skill.active).length,
    inactive: skills.filter((skill) => !skill.active).length,
  }), [skills]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const payload = toPayload(form);
    const url = editingId ? `/api/admin/skills/${editingId}` : "/api/admin/skills";
    const method = editingId ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.saveError);
      const saved = data.skill as SkillRow;
      setSkills((current) => editingId
        ? current.map((skill) => skill.id === saved.id ? saved : skill)
        : [...current, saved]);
      setForm(emptyForm);
      setEditingId(null);
      setSuccess(editingId ? copy.updated : copy.created);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(skill: SkillRow) {
    const nextActive = !skill.active;
    if (!nextActive && !window.confirm(copy.deactivateConfirm)) return;
    await saveSkill(skill.id, {
      instrument: skill.instrument as SkillInstrument,
      name: skill.name,
      description: skill.description ?? "",
      sortOrder: String(skill.sortOrder),
      active: nextActive,
    }, nextActive ? copy.activated : copy.deactivated);
  }

  async function saveSkill(skillId: string, state: SkillFormState, successMessage: string) {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(state)),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.saveError);
      const saved = data.skill as SkillRow;
      setSkills((current) => current.map((skill) => skill.id === saved.id ? saved : skill));
      setSuccess(successMessage);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setPending(false);
    }
  }

  async function syncDefaults() {
    if (overwriteDefaults && !window.confirm(copy.overwriteConfirm)) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/skills/sync-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwriteDefaults }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.syncError);
      setSkills(data.skills as SkillRow[]);
      setSuccess(copy.syncSuccess(data.result?.created ?? 0, data.result?.updated ?? 0, data.result?.skipped ?? 0));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : copy.syncError);
    } finally {
      setPending(false);
    }
  }

  function editSkill(skill: SkillRow) {
    setEditingId(skill.id);
    setForm({
      instrument: skill.instrument as SkillInstrument,
      name: skill.name,
      description: skill.description ?? "",
      sortOrder: String(skill.sortOrder),
      active: skill.active,
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label={copy.total} value={counts.total} />
        <SummaryCard label={copy.active} value={counts.active} tone="gold" />
        <SummaryCard label={copy.inactive} value={counts.inactive} tone="muted" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{copy.syncTitle}</CardTitle>
            <CardDescription>{copy.syncDescription}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-soft)]">
              <input
                type="checkbox"
                checked={overwriteDefaults}
                onChange={(event) => setOverwriteDefaults(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-gold-deep)]"
              />
              {copy.overwriteDefaults}
            </label>
            <Button type="button" variant="gold" onClick={syncDefaults} disabled={pending}>{copy.syncDefaults}</Button>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
      </Card>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{editingId ? copy.editTitle : copy.createTitle}</CardTitle>
            <CardDescription>{copy.formDescription}</CardDescription>
          </div>
          {editingId ? <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); }}>{copy.cancelEdit}</Button> : null}
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-[0.7fr_1.2fr_1.6fr_0.45fr_0.45fr_auto] lg:items-end">
          <Field label={copy.instrument}>
            <select value={form.instrument} onChange={(event) => setFormField("instrument", event.target.value as SkillInstrument)} className={selectClassName}>
              {skillInstruments.map((instrument) => <option key={instrument} value={instrument}>{instrumentLabel(instrument, isSpanish)}</option>)}
            </select>
          </Field>
          <Field label={copy.name}><Input value={form.name} onChange={(event) => setFormField("name", event.target.value)} required maxLength={100} /></Field>
          <Field label={copy.description}><Textarea value={form.description} onChange={(event) => setFormField("description", event.target.value)} maxLength={500} rows={2} /></Field>
          <Field label={copy.sortOrder}><Input type="number" min={0} max={10000} value={form.sortOrder} onChange={(event) => setFormField("sortOrder", event.target.value)} required /></Field>
          <label className="flex h-[3.15rem] items-center gap-2 rounded-[1.05rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm font-semibold text-[var(--color-ink-soft)]">
            <input type="checkbox" checked={form.active} onChange={(event) => setFormField("active", event.target.checked)} className="h-4 w-4 accent-[var(--color-gold-deep)]" />
            {copy.active}
          </label>
          <Button type="submit" variant="gold" disabled={pending}>{pending ? copy.saving : editingId ? copy.saveChanges : copy.create}</Button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{copy.listTitle}</CardTitle>
            <CardDescription>{copy.listDescription}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["active", "inactive", "all"] as FilterValue[]).map((value) => (
              <Button key={value} type="button" variant={filter === value ? "gold" : "outline"} size="sm" onClick={() => setFilter(value)}>
                {filterLabel(value, copy)}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          {groupedSkills.map((group) => (
            <section key={group.instrument} className="rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)]/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">{instrumentLabel(group.instrument, isSpanish)}</h3>
                <Badge variant="gold">{group.skills.length}</Badge>
              </div>
              <div className="mt-3 grid gap-2">
                {group.skills.map((skill) => (
                  <article key={skill.id} className="rounded-[1.15rem] border border-[var(--color-border)] bg-white/72 p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--color-ink)]">{skill.name}</p>
                          <Badge variant={skill.active ? "success" : "default"}>{skill.active ? copy.active : copy.inactive}</Badge>
                          <Badge>{copy.orderShort} {skill.sortOrder}</Badge>
                          <Badge>{copy.used} {skill.usageCount}</Badge>
                        </div>
                        {skill.description ? <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{skill.description}</p> : null}
                        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                          {copy.usageDetail}: {copy.lessonRatings} {skill.usage.lessonRatings} · {copy.assignments} {skill.usage.practiceAssignments} · {copy.logs} {skill.usage.practiceLogs} · {copy.videos} {skill.usage.practiceVideos + skill.usage.videoSkillRatings}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => editSkill(skill)}>{copy.edit}</Button>
                        <Button type="button" variant={skill.active ? "outline" : "gold"} size="sm" onClick={() => toggleActive(skill)} disabled={pending}>
                          {skill.active ? copy.deactivate : copy.activate}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
                {!group.skills.length ? <p className="text-sm text-[var(--color-ink-soft)]">{copy.noSkills}</p> : null}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );

  function setFormField<K extends keyof SkillFormState>(key: K, value: SkillFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
}

function toPayload(form: SkillFormState) {
  return {
    instrument: form.instrument,
    name: form.name,
    description: form.description,
    sortOrder: Number(form.sortOrder),
    active: form.active,
  };
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "gold" | "muted" }) {
  return (
    <Card className={tone === "gold" ? "border-[var(--color-gold)]/35" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">{label}</p>
      <p className={`mt-2 font-display text-4xl tracking-[-0.055em] ${tone === "muted" ? "text-[var(--color-ink-soft)]" : "text-[var(--color-ink)]"}`}>{value}</p>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-left">
      <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  );
}

const selectClassName = "h-[3.15rem] w-full rounded-[1.05rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm text-[var(--color-ink)]";

function instrumentLabel(instrument: string, isSpanish: boolean) {
  if (instrument === "VOICE") return isSpanish ? "Voz" : "Voice";
  if (instrument === "PIANO") return "Piano";
  return isSpanish ? "General" : "General";
}

function filterLabel(value: FilterValue, copy: ReturnType<typeof getCopy>) {
  if (value === "inactive") return copy.inactive;
  if (value === "all") return copy.all;
  return copy.active;
}

function getCopy(isSpanish: boolean) {
  return isSpanish
    ? {
        total: "Total",
        active: "Activa",
        inactive: "Inactiva",
        all: "Todas",
        syncTitle: "Sincronizar habilidades base",
        syncDescription: "Crea las habilidades base de desarrollo si faltan en producción. Por defecto no sobrescribe cambios existentes.",
        overwriteDefaults: "Sobrescribir habilidades base existentes",
        overwriteConfirm: "Esto actualizará nombre, descripción, orden y reactivará habilidades base existentes. ¿Continuar?",
        syncDefaults: "Sincronizar habilidades base",
        syncError: "No se pudieron sincronizar las habilidades.",
        syncSuccess: (created: number, updated: number, skipped: number) => `Sincronización completa. Creadas: ${created}. Actualizadas: ${updated}. Omitidas: ${skipped}.`,
        createTitle: "Agregar habilidad",
        editTitle: "Editar habilidad",
        formDescription: "Gestiona las categorías que aparecen en notas, tareas, videos y reportes.",
        cancelEdit: "Cancelar edición",
        instrument: "Instrumento",
        name: "Nombre",
        description: "Descripción",
        sortOrder: "Orden",
        create: "Crear habilidad",
        saveChanges: "Guardar cambios",
        saving: "Guardando...",
        saveError: "No se pudo guardar la habilidad.",
        created: "Habilidad creada.",
        updated: "Habilidad actualizada.",
        activated: "Habilidad activada.",
        deactivated: "Habilidad desactivada.",
        deactivateConfirm: "Desactivar oculta esta habilidad de nuevos formularios, pero conserva el historial. ¿Continuar?",
        listTitle: "Todas las habilidades",
        listDescription: "Organizadas por instrumento. Las inactivas se conservan para historial académico.",
        orderShort: "Orden",
        used: "Usos",
        usageDetail: "Uso",
        lessonRatings: "notas",
        assignments: "tareas",
        logs: "registros",
        videos: "videos",
        edit: "Editar",
        activate: "Activar",
        deactivate: "Desactivar",
        noSkills: "No hay habilidades en este filtro.",
      }
    : {
        total: "Total",
        active: "Active",
        inactive: "Inactive",
        all: "All",
        syncTitle: "Sync default skills",
        syncDescription: "Creates missing default development skills in production. By default, existing production edits are not overwritten.",
        overwriteDefaults: "Overwrite existing default skills",
        overwriteConfirm: "This will update name, description, order, and reactivate existing default skills. Continue?",
        syncDefaults: "Sync default skills",
        syncError: "Could not sync skills.",
        syncSuccess: (created: number, updated: number, skipped: number) => `Sync complete. Created: ${created}. Updated: ${updated}. Skipped: ${skipped}.`,
        createTitle: "Add skill",
        editTitle: "Edit skill",
        formDescription: "Manage the categories used in lesson notes, assignments, videos, and reports.",
        cancelEdit: "Cancel edit",
        instrument: "Instrument",
        name: "Name",
        description: "Description",
        sortOrder: "Sort order",
        create: "Create skill",
        saveChanges: "Save changes",
        saving: "Saving...",
        saveError: "Could not save skill.",
        created: "Skill created.",
        updated: "Skill updated.",
        activated: "Skill activated.",
        deactivated: "Skill deactivated.",
        deactivateConfirm: "Deactivation hides this skill from new forms but preserves history. Continue?",
        listTitle: "All skills",
        listDescription: "Grouped by instrument. Inactive skills are kept for academic history.",
        orderShort: "Order",
        used: "Uses",
        usageDetail: "Usage",
        lessonRatings: "notes",
        assignments: "assignments",
        logs: "logs",
        videos: "videos",
        edit: "Edit",
        activate: "Activate",
        deactivate: "Deactivate",
        noSkills: "No skills in this filter.",
      };
}
