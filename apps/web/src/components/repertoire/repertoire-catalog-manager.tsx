"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { displayInstrument, InstrumentSelect } from "@/components/instrument-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { instrumentOptions } from "@/lib/instruments";
import type { AppLocale } from "@/lib/i18n/locales";

const selectClass = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";

type CatalogItem = {
  id: string;
  title: string;
  composerOrArtist?: string | null;
  instrument: string;
  level?: string | null;
  defaultFocusSection?: string | null;
  defaultCurrentTempo?: number | null;
  defaultTargetTempo?: number | null;
  defaultTeacherNotes?: string | null;
  defaultStudentVisibleNotes?: string | null;
  tags?: string | null;
};

type StudentOption = {
  id: string;
  name: string;
  instrument?: string | null;
  teacherName?: string | null;
};

function copy(locale: AppLocale) {
  return locale === "es" ? {
    createTitle: "Agregar canción al catálogo",
    createDescription: "Este catálogo es compartido por la academia. Al asignar una canción se crea el progreso específico del estudiante.",
    search: "Buscar canción, artista o etiqueta",
    instrument: "Instrumento",
    allInstruments: "Todos los instrumentos",
    searchButton: "Buscar",
    title: "Título",
    composer: "Compositor o artista",
    level: "Nivel",
    tags: "Etiquetas (separadas por coma)",
    teacherNotes: "Notas docentes sugeridas",
    studentNotes: "Notas visibles sugeridas",
    create: "Guardar en catálogo",
    save: "Guardar cambios",
    assign: "Asignar a estudiante",
    selectStudent: "Selecciona estudiante",
    assigned: "Canción asignada al estudiante.",
    saved: "Catálogo actualizado.",
    error: "No se pudo completar la acción.",
    noItems: "No encontramos canciones con esos filtros.",
    edit: "Editar",
  } : {
    createTitle: "Add song to catalog",
    createDescription: "This catalog is shared by the academy. Assigning a song creates student-specific progress.",
    search: "Search song, artist, or tag",
    instrument: "Instrument",
    allInstruments: "All instruments",
    searchButton: "Search",
    title: "Title",
    composer: "Composer or artist",
    level: "Level",
    tags: "Tags (comma-separated)",
    teacherNotes: "Suggested teacher notes",
    studentNotes: "Suggested visible notes",
    create: "Save to catalog",
    save: "Save changes",
    assign: "Assign to student",
    selectStudent: "Select student",
    assigned: "Song assigned to student.",
    saved: "Catalog updated.",
    error: "Could not complete the action.",
    noItems: "No songs found with those filters.",
    edit: "Edit",
  };
}

export function RepertoireCatalogManager({
  locale,
  initialItems,
  students,
}: {
  locale: AppLocale;
  initialItems: CatalogItem[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const c = copy(locale);
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [instrument, setInstrument] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const instruments = useMemo(() => instrumentOptions(locale), [locale]);

  async function search() {
    setMessage(null);
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (instrument) params.set("instrument", instrument);
    params.set("limit", "80");
    const response = await fetch(`/api/repertoire/catalog?${params.toString()}`);
    const payload = await response.json().catch(() => null) as { items?: CatalogItem[]; error?: string } | null;
    if (!response.ok || !payload?.items) {
      setMessage(payload?.error ?? c.error);
      return;
    }
    setItems(payload.items);
  }

  async function create(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/repertoire/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catalogPayload(formData)),
    });
    const payload = await response.json().catch(() => null) as { item?: CatalogItem; error?: string } | null;
    if (!response.ok || !payload?.item) {
      setMessage(payload?.error ?? c.error);
      return;
    }
    setItems((current) => [payload.item!, ...current]);
    setMessage(c.saved);
    startTransition(() => router.refresh());
  }

  async function update(itemId: string, formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/repertoire/catalog/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catalogPayload(formData)),
    });
    const payload = await response.json().catch(() => null) as { item?: CatalogItem; error?: string } | null;
    if (!response.ok || !payload?.item) {
      setMessage(payload?.error ?? c.error);
      return;
    }
    setItems((current) => current.map((item) => item.id === itemId ? payload.item! : item));
    setMessage(c.saved);
    startTransition(() => router.refresh());
  }

  async function assign(itemId: string, formData: FormData) {
    setMessage(null);
    const studentId = String(formData.get("studentId") ?? "");
    if (!studentId) {
      setMessage(c.selectStudent);
      return;
    }
    const response = await fetch(`/api/repertoire/catalog/${itemId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setMessage(response.ok ? c.assigned : payload?.error ?? c.error);
    if (response.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <Card className="h-fit">
        <CardTitle>{c.createTitle}</CardTitle>
        <CardDescription>{c.createDescription}</CardDescription>
        <CatalogForm c={c} locale={locale} onSubmit={create} submitLabel={c.create} />
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} />
            <select className={selectClass} value={instrument} onChange={(event) => setInstrument(event.target.value)} aria-label={c.instrument}>
              <option value="">{c.allInstruments}</option>
              {instruments.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button type="button" variant="gold" disabled={pending} onClick={search}>{c.searchButton}</Button>
          </div>
          {message ? <p className="mt-3 rounded-xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-sm text-[var(--color-ink-soft)]">{message}</p> : null}
        </Card>

        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="break-words">{item.title}</CardTitle>
                    <Badge variant="gold">{displayInstrument(item.instrument, locale)}</Badge>
                  </div>
                  <CardDescription>{[item.composerOrArtist, item.level, item.tags].filter(Boolean).join(" · ") || displayInstrument(item.instrument, locale)}</CardDescription>
                </div>
                <form action={(formData) => assign(item.id, formData)} className="flex min-w-0 flex-col gap-2 sm:flex-row lg:min-w-[24rem]">
                  <select name="studentId" className={selectClass} defaultValue="">
                    <option value="">{c.selectStudent}</option>
                    {students.map((student) => <option key={student.id} value={student.id}>{student.name}{student.instrument ? ` · ${displayInstrument(student.instrument, locale)}` : ""}</option>)}
                  </select>
                  <Button type="submit" variant="outline" disabled={pending}>{c.assign}</Button>
                </form>
              </div>
              <details className="mt-4 rounded-[1.2rem] border border-[var(--color-border)] bg-white/58 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--color-gold-deep)]">{c.edit}</summary>
        <CatalogForm c={c} locale={locale} item={item} submitLabel={c.save} onSubmit={(formData) => update(item.id, formData)} />
              </details>
            </Card>
          ))}
          {!items.length ? <Card><CardDescription>{c.noItems}</CardDescription></Card> : null}
        </div>
      </div>
    </div>
  );
}

function CatalogForm({ c, locale, item, submitLabel, onSubmit }: { c: ReturnType<typeof copy>; locale: AppLocale; item?: CatalogItem; submitLabel: string; onSubmit: (formData: FormData) => void }) {
  return (
    <form action={onSubmit} className="mt-4 grid gap-2 md:grid-cols-2">
      <Input name="title" required defaultValue={item?.title} placeholder={c.title} />
      <Input name="composerOrArtist" defaultValue={item?.composerOrArtist ?? ""} placeholder={c.composer} />
      <InstrumentSelect name="instrument" locale={locale} defaultValue={item?.instrument} required aria-label={c.instrument} />
      <Input name="level" defaultValue={item?.level ?? ""} placeholder={c.level} />
      <Input name="tags" defaultValue={item?.tags ?? ""} placeholder={c.tags} className="md:col-span-2" />
      <Textarea name="defaultTeacherNotes" defaultValue={item?.defaultTeacherNotes ?? ""} placeholder={c.teacherNotes} className="md:col-span-2" />
      <Textarea name="defaultStudentVisibleNotes" defaultValue={item?.defaultStudentVisibleNotes ?? ""} placeholder={c.studentNotes} className="md:col-span-2" />
      <Button type="submit" variant="gold" className="md:col-span-2">{submitLabel}</Button>
    </form>
  );
}

function catalogPayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    composerOrArtist: String(formData.get("composerOrArtist") ?? ""),
    instrument: String(formData.get("instrument") ?? ""),
    level: String(formData.get("level") ?? ""),
    defaultTeacherNotes: String(formData.get("defaultTeacherNotes") ?? ""),
    defaultStudentVisibleNotes: String(formData.get("defaultStudentVisibleNotes") ?? ""),
    tags: String(formData.get("tags") ?? ""),
  };
}
