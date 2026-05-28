"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type RoleValue = "STUDENT" | "TEACHER" | "ADMIN" | "PARENT";
type AnnouncementTypeValue = "GENERAL" | "FEATURE" | "BILLING" | "MAINTENANCE";
type AnnouncementStatusValue = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type AnnouncementRow = {
  id: string;
  type: AnnouncementTypeValue;
  status: AnnouncementStatusValue;
  targetRoles: RoleValue[];
  titleEn: string;
  bodyEn: string;
  titleEs: string;
  bodyEs: string;
  ctaLabelEn: string | null;
  ctaLabelEs: string | null;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  dismissalCount: number;
};

type AnnouncementFormState = {
  type: AnnouncementTypeValue;
  status: AnnouncementStatusValue;
  targetRoles: RoleValue[];
  titleEn: string;
  bodyEn: string;
  titleEs: string;
  bodyEs: string;
  ctaLabelEn: string;
  ctaLabelEs: string;
  ctaUrl: string;
  startsAt: string;
  endsAt: string;
};

const roleOptions: RoleValue[] = ["STUDENT", "PARENT", "TEACHER", "ADMIN"];
const typeOptions: AnnouncementTypeValue[] = ["GENERAL", "FEATURE", "BILLING", "MAINTENANCE"];
const statusOptions: AnnouncementStatusValue[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

const emptyForm: AnnouncementFormState = {
  type: "GENERAL",
  status: "DRAFT",
  targetRoles: ["STUDENT", "TEACHER"],
  titleEn: "",
  bodyEn: "",
  titleEs: "",
  bodyEs: "",
  ctaLabelEn: "",
  ctaLabelEs: "",
  ctaUrl: "",
  startsAt: "",
  endsAt: "",
};

export function AppAnnouncementManager({ initialAnnouncements, locale }: { initialAnnouncements: AnnouncementRow[]; locale: AppLocale }) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [form, setForm] = useState<AnnouncementFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSpanish = locale === "es";
  const copy = getCopy(isSpanish);

  const counts = useMemo(() => ({
    total: announcements.length,
    published: announcements.filter((item) => item.status === "PUBLISHED").length,
    draft: announcements.filter((item) => item.status === "DRAFT").length,
    archived: announcements.filter((item) => item.status === "ARCHIVED").length,
  }), [announcements]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = toPayload(form);
    const url = editingId ? `/api/admin/announcements/${editingId}` : "/api/admin/announcements";
    const method = editingId ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.saveError);
      const saved = normalizeAnnouncement(data.announcement);
      setAnnouncements((current) => editingId
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setForm(emptyForm);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function removeAnnouncement(id: string) {
    if (!window.confirm(copy.deleteConfirm)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(copy.deleteError);
      setAnnouncements((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : copy.deleteError);
    } finally {
      setSaving(false);
    }
  }

  function editAnnouncement(announcement: AnnouncementRow) {
    setEditingId(announcement.id);
    setForm({
      type: announcement.type,
      status: announcement.status,
      targetRoles: announcement.targetRoles,
      titleEn: announcement.titleEn,
      bodyEn: announcement.bodyEn,
      titleEs: announcement.titleEs,
      bodyEs: announcement.bodyEs,
      ctaLabelEn: announcement.ctaLabelEn ?? "",
      ctaLabelEs: announcement.ctaLabelEs ?? "",
      ctaUrl: announcement.ctaUrl ?? "",
      startsAt: toDateTimeLocal(announcement.startsAt),
      endsAt: toDateTimeLocal(announcement.endsAt),
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={copy.total} value={counts.total} />
        <SummaryCard label={copy.published} value={counts.published} tone="success" />
        <SummaryCard label={copy.draft} value={counts.draft} />
        <SummaryCard label={copy.archived} value={counts.archived} tone="muted" />
      </div>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{editingId ? copy.editTitle : copy.newTitle}</CardTitle>
            <CardDescription>{copy.formDescription}</CardDescription>
          </div>
          {editingId ? <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); }}>{copy.cancelEdit}</Button> : null}
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={copy.type}>
              <select value={form.type} onChange={(event) => setFormField("type", event.target.value as AnnouncementTypeValue)} className={selectClassName}>
                {typeOptions.map((type) => <option key={type} value={type}>{typeLabel(type, isSpanish)}</option>)}
              </select>
            </Field>
            <Field label={copy.status}>
              <select value={form.status} onChange={(event) => setFormField("status", event.target.value as AnnouncementStatusValue)} className={selectClassName}>
                {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status, isSpanish)}</option>)}
              </select>
            </Field>
            <Field label={copy.roles}>
              <div className="flex min-h-[3.35rem] flex-wrap items-center gap-2 rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-3 py-2">
                {roleOptions.map((role) => (
                  <label key={role} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-soft)]">
                    <input
                      type="checkbox"
                      checked={form.targetRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="h-3.5 w-3.5 accent-[var(--color-gold-deep)]"
                    />
                    {roleLabel(role, isSpanish)}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label={copy.titleEn}><Input value={form.titleEn} onChange={(event) => setFormField("titleEn", event.target.value)} required maxLength={140} /></Field>
            <Field label={copy.titleEs}><Input value={form.titleEs} onChange={(event) => setFormField("titleEs", event.target.value)} required maxLength={140} /></Field>
            <Field label={copy.bodyEn}><Textarea value={form.bodyEn} onChange={(event) => setFormField("bodyEn", event.target.value)} required maxLength={1000} /></Field>
            <Field label={copy.bodyEs}><Textarea value={form.bodyEs} onChange={(event) => setFormField("bodyEs", event.target.value)} required maxLength={1000} /></Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field label={copy.ctaLabelEn}><Input value={form.ctaLabelEn} onChange={(event) => setFormField("ctaLabelEn", event.target.value)} maxLength={80} /></Field>
            <Field label={copy.ctaLabelEs}><Input value={form.ctaLabelEs} onChange={(event) => setFormField("ctaLabelEs", event.target.value)} maxLength={80} /></Field>
            <Field label={copy.ctaUrl}><Input value={form.ctaUrl} onChange={(event) => setFormField("ctaUrl", event.target.value)} placeholder="/admin/changelog" maxLength={500} /></Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.startsAt}><Input type="datetime-local" value={form.startsAt} onChange={(event) => setFormField("startsAt", event.target.value)} /></Field>
            <Field label={copy.endsAt}><Input type="datetime-local" value={form.endsAt} onChange={(event) => setFormField("endsAt", event.target.value)} /></Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="gold" disabled={saving}>{saving ? copy.saving : editingId ? copy.saveChanges : copy.create}</Button>
            <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, targetRoles: roleOptions }))}>{copy.targetAll}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>{copy.listTitle}</CardTitle>
        <CardDescription>{copy.listDescription}</CardDescription>
        <div className="mt-5 grid gap-3">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4 shadow-[0_10px_24px_rgba(78,55,30,0.035)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={announcement.status === "PUBLISHED" ? "success" : announcement.status === "ARCHIVED" ? "default" : "warning"}>{statusLabel(announcement.status, isSpanish)}</Badge>
                    <Badge variant="gold">{typeLabel(announcement.type, isSpanish)}</Badge>
                    <Badge>{announcement.targetRoles.map((role) => roleLabel(role, isSpanish)).join(" · ")}</Badge>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[var(--color-ink)]">{isSpanish ? announcement.titleEs : announcement.titleEn}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{isSpanish ? announcement.bodyEs : announcement.bodyEn}</p>
                  <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                    {copy.dismissed}: {announcement.dismissalCount} · {copy.createdBy}: {announcement.createdByName} · {copy.updated}: {formatDate(announcement.updatedAt, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => editAnnouncement(announcement)}>{copy.edit}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAnnouncement(announcement.id)}>{copy.delete}</Button>
                </div>
              </div>
            </article>
          ))}
          {!announcements.length ? <CardDescription>{copy.empty}</CardDescription> : null}
        </div>
      </Card>
    </div>
  );

  function setFormField<K extends keyof AnnouncementFormState>(key: K, value: AnnouncementFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(role: RoleValue) {
    setForm((current) => {
      const nextRoles = current.targetRoles.includes(role)
        ? current.targetRoles.filter((item) => item !== role)
        : [...current.targetRoles, role];
      return { ...current, targetRoles: nextRoles };
    });
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "muted" }) {
  const color = tone === "success" ? "text-[var(--color-success)]" : tone === "muted" ? "text-[var(--color-ink-soft)]" : "text-[var(--color-ink)]";
  return (
    <Card density="compact">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p>
      <p className={cn("mt-2 font-display text-4xl tracking-[-0.05em]", color)}>{value}</p>
    </Card>
  );
}

function toPayload(form: AnnouncementFormState) {
  return {
    ...form,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    ctaLabelEn: form.ctaLabelEn || undefined,
    ctaLabelEs: form.ctaLabelEs || undefined,
    ctaUrl: form.ctaUrl || undefined,
  };
}

function normalizeAnnouncement(value: AnnouncementRow & { createdBy?: { name?: string | null; email?: string | null }; _count?: { dismissals?: number } }): AnnouncementRow {
  return {
    ...value,
    createdByName: value.createdByName ?? value.createdBy?.name ?? value.createdBy?.email ?? "Harmonizing",
    dismissalCount: value.dismissalCount ?? value._count?.dismissals ?? 0,
  };
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function typeLabel(type: AnnouncementTypeValue, isSpanish: boolean) {
  const labels = {
    GENERAL: isSpanish ? "Anuncio" : "Announcement",
    FEATURE: isSpanish ? "Nueva función" : "New feature",
    BILLING: isSpanish ? "Facturación" : "Billing",
    MAINTENANCE: isSpanish ? "Mantenimiento" : "Maintenance",
  };
  return labels[type];
}

function statusLabel(status: AnnouncementStatusValue, isSpanish: boolean) {
  const labels = {
    DRAFT: isSpanish ? "Borrador" : "Draft",
    PUBLISHED: isSpanish ? "Publicado" : "Published",
    ARCHIVED: isSpanish ? "Archivado" : "Archived",
  };
  return labels[status];
}

function roleLabel(role: RoleValue, isSpanish: boolean) {
  const labels = {
    STUDENT: isSpanish ? "Estudiantes" : "Students",
    PARENT: isSpanish ? "Acudientes" : "Guardians",
    TEACHER: isSpanish ? "Docentes" : "Teachers",
    ADMIN: isSpanish ? "Administración" : "Admins",
  };
  return labels[role];
}

function getCopy(isSpanish: boolean) {
  return isSpanish ? {
    total: "Total",
    published: "Publicados",
    draft: "Borradores",
    archived: "Archivados",
    newTitle: "Nuevo anuncio",
    editTitle: "Editar anuncio",
    formDescription: "Publica mensajes compactos para grupos de usuarios. Cada persona puede descartarlos de forma independiente.",
    cancelEdit: "Cancelar edición",
    type: "Tipo",
    status: "Estado",
    roles: "Audiencia",
    titleEn: "Título en inglés",
    titleEs: "Título en español",
    bodyEn: "Mensaje en inglés",
    bodyEs: "Mensaje en español",
    ctaLabelEn: "Botón en inglés",
    ctaLabelEs: "Botón en español",
    ctaUrl: "URL del botón",
    startsAt: "Mostrar desde",
    endsAt: "Mostrar hasta",
    saving: "Guardando...",
    saveChanges: "Guardar cambios",
    create: "Crear anuncio",
    targetAll: "Todos los roles",
    listTitle: "Anuncios creados",
    listDescription: "Los anuncios publicados aparecen en el banner superior de los roles seleccionados.",
    dismissed: "Descartado",
    createdBy: "Creado por",
    updated: "Actualizado",
    edit: "Editar",
    delete: "Eliminar",
    empty: "No hay anuncios todavía.",
    saveError: "No se pudo guardar el anuncio.",
    deleteError: "No se pudo eliminar el anuncio.",
    deleteConfirm: "¿Eliminar este anuncio? Esta acción no se puede deshacer.",
  } : {
    total: "Total",
    published: "Published",
    draft: "Drafts",
    archived: "Archived",
    newTitle: "New announcement",
    editTitle: "Edit announcement",
    formDescription: "Publish compact messages for user groups. Each person can dismiss them independently.",
    cancelEdit: "Cancel edit",
    type: "Type",
    status: "Status",
    roles: "Audience",
    titleEn: "English title",
    titleEs: "Spanish title",
    bodyEn: "English message",
    bodyEs: "Spanish message",
    ctaLabelEn: "English button label",
    ctaLabelEs: "Spanish button label",
    ctaUrl: "Button URL",
    startsAt: "Show from",
    endsAt: "Show until",
    saving: "Saving...",
    saveChanges: "Save changes",
    create: "Create announcement",
    targetAll: "All roles",
    listTitle: "Created announcements",
    listDescription: "Published announcements appear in the top banner for selected roles.",
    dismissed: "Dismissed",
    createdBy: "Created by",
    updated: "Updated",
    edit: "Edit",
    delete: "Delete",
    empty: "No announcements yet.",
    saveError: "Could not save announcement.",
    deleteError: "Could not delete announcement.",
    deleteConfirm: "Delete this announcement? This cannot be undone.",
  };
}

const selectClassName = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";
