"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/locales";

type PreviewRow = {
  rowNumber: number;
  status: "valid" | "error";
  errors: string[];
  warnings: string[];
  matchedTeacherName: string | null;
  existingStudent: boolean;
  normalized: {
    studentName: string;
    studentEmail: string;
    teacherEmail: string;
    studentInstrument: string;
    monthlySessionCount: number;
    pricePerClassCop: number;
    guardians: Array<{ name: string; email: string; relationship: string; primaryContact: boolean }>;
    alegraContactId: string | null;
    defaultTimezone: string;
  } | null;
};

type Preview = {
  ok: boolean;
  filename?: string | null;
  missingHeaders: string[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  appliedRows?: number;
  skippedRows?: number;
  failedRows?: number;
  emailsSuppressed: true;
  rows: PreviewRow[];
  errors: string[];
  batchId?: string;
};

const sampleCsv = `student_name,student_email,teacher_email,student_instrument,monthly_session_count,price_per_class_cop,student_phone,parent1_name,parent1_email,parent1_relationship,parent1_phone,parent2_name,parent2_email,parent2_relationship,parent2_phone,alegra_contact_id,notes
Tomas Barcenas,tomas@example.com,maria@example.com,Piano,4,70834,+1 555 123 4567,Andres Barcenas,andres@example.com,Father,+1 555 222 3333,,,,,28,Imported May 2026`;

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export function StudentProvisioningImportPanel({ locale = "en" }: { locale?: AppLocale }) {
  const router = useRouter();
  const isSpanish = locale === "es";
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [pending, setPending] = useState<"preview" | "apply" | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readFile(file: File | null) {
    setError(null);
    setPreview(null);
    if (!file) return;
    setFilename(file.name);
    const text = await file.text();
    setCsv(text);
  }

  async function postImport(endpoint: "preview" | "apply") {
    setPending(endpoint);
    setError(null);
    const response = await fetch(`/api/admin/imports/student-provisioning/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, filename }),
    });
    const data = (await response.json().catch(() => null)) as Preview | { error?: string } | null;
    if (!response.ok) {
      setError((data && "error" in data && data.error) || (isSpanish ? "No se pudo procesar el CSV." : "Could not process the CSV."));
      setPending(null);
      return;
    }
    setPreview(data as Preview);
    setPending(null);
    if (endpoint === "apply") router.refresh();
  }

  return (
    <Card>
      <CardTitle>{isSpanish ? "Importar estudiantes, acudientes y facturación" : "Import students, guardians, and billing"}</CardTitle>
      <CardDescription>
        {isSpanish
          ? "Sube un CSV por estudiante. Los docentes deben existir; los usuarios importados no reciben correos ni enlaces mágicos."
          : "Upload one CSV row per student. Teachers must already exist; imported users do not receive emails or magic links."}
      </CardDescription>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void readFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-[1rem] border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-ink)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-gold-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-gold-deep)]"
          />
          <Textarea
            value={csv}
            onChange={(event) => {
              setCsv(event.target.value);
              setPreview(null);
            }}
            rows={8}
            placeholder={sampleCsv}
            className="font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={!csv.trim() || pending !== null} onClick={() => void postImport("preview")}>
              {pending === "preview" ? (isSpanish ? "Validando..." : "Previewing...") : (isSpanish ? "Previsualizar" : "Preview CSV")}
            </Button>
            <Button type="button" variant="gold" disabled={!preview?.validRows || pending !== null} onClick={() => void postImport("apply")}>
              {pending === "apply" ? (isSpanish ? "Importando..." : "Importing...") : (isSpanish ? "Aplicar filas válidas" : "Apply valid rows")}
            </Button>
          </div>
          <p className="text-xs leading-5 text-[var(--color-ink-soft)]">
            {isSpanish
              ? "Zona horaria predeterminada: America/New_York. Los usuarios podrán solicitar su enlace mágico desde iniciar sesión cuando estén listos."
              : "Default timezone: America/New_York. Users can request their own magic link from sign-in when ready."}
          </p>
          {error ? <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">
            {isSpanish ? "Columnas esperadas" : "Expected columns"}
          </p>
          <pre className="mt-2 overflow-x-auto rounded-[0.9rem] bg-white/80 p-3 text-[11px] leading-5 text-[var(--color-ink-soft)]"><code>{sampleCsv.split("\n")[0]}</code></pre>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
            <Badge variant="gold">{isSpanish ? "Docente existente requerido" : "Existing teacher required"}</Badge>
            <Badge variant="success">{isSpanish ? "Correos suprimidos" : "Emails suppressed"}</Badge>
            <Badge>{isSpanish ? "Padres 1 y 2 opcionales" : "Parent 1 and 2 optional"}</Badge>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Summary label={isSpanish ? "Filas" : "Rows"} value={String(preview.totalRows)} />
            <Summary label={isSpanish ? "Válidas" : "Valid"} value={String(preview.validRows)} />
            <Summary label={isSpanish ? "Errores" : "Errors"} value={String(preview.errorRows)} />
            <Summary label={isSpanish ? "Aplicadas" : "Applied"} value={String(preview.appliedRows ?? 0)} />
          </div>

          {preview.errors.length ? (
            <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {preview.errors.map((message) => <p key={message}>{message}</p>)}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-[1.2rem] border border-[var(--color-border)] bg-white/72">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                <tr>
                  <th className="px-3 py-2">{isSpanish ? "Fila" : "Row"}</th>
                  <th className="px-3 py-2">{isSpanish ? "Estado" : "Status"}</th>
                  <th className="px-3 py-2">{isSpanish ? "Estudiante" : "Student"}</th>
                  <th className="px-3 py-2">{isSpanish ? "Docente" : "Teacher"}</th>
                  <th className="px-3 py-2">{isSpanish ? "Facturación" : "Billing"}</th>
                  <th className="px-3 py-2">{isSpanish ? "Acudientes" : "Guardians"}</th>
                  <th className="px-3 py-2">{isSpanish ? "Mensajes" : "Messages"}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-[var(--color-border)] align-top">
                    <td className="px-3 py-3 text-xs text-[var(--color-ink-soft)]">{row.rowNumber}</td>
                    <td className="px-3 py-3"><Badge variant={row.status === "valid" ? "success" : "danger"}>{row.status}</Badge></td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[var(--color-ink)]">{row.normalized?.studentName ?? "-"}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{row.normalized?.studentEmail ?? ""}</p>
                      {row.existingStudent ? <p className="text-xs text-amber-700">{isSpanish ? "Se actualizará" : "Will update"}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[var(--color-ink)]">{row.matchedTeacherName ?? "-"}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{row.normalized?.teacherEmail ?? ""}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-ink-soft)]">
                      {row.normalized ? `${row.normalized.monthlySessionCount} sessions · ${formatCop(row.normalized.pricePerClassCop)}` : "-"}
                      {row.normalized?.alegraContactId ? <p>Alegra: {row.normalized.alegraContactId}</p> : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-ink-soft)]">
                      {row.normalized?.guardians.length ? row.normalized.guardians.map((guardian) => <p key={guardian.email}>{guardian.name} · {guardian.email}</p>) : "-"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {[...row.errors, ...row.warnings].map((message) => (
                        <p key={message} className={row.errors.includes(message) ? "text-rose-700" : "text-amber-700"}>{message}</p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.batchId ? (
            <p className="text-xs text-[var(--color-ink-soft)]">
              {isSpanish ? "Lote aplicado" : "Applied batch"}: {preview.batchId}. {isSpanish ? "Correos suprimidos." : "Emails suppressed."}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--color-border)] bg-white/72 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold-deep)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
