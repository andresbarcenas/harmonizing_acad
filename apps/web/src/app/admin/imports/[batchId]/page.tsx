import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoricalImportRowStatus, Role } from "@prisma/client";

import { HistoricalImportRowActions } from "@/components/admin/historical-import-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";

type PageProps = { params: Promise<{ batchId: string }> };

export default async function AdminHistoricalImportDetailPage({ params }: PageProps) {
  const viewer = await requireViewer([Role.ADMIN]);
  const { batchId } = await params;
  const isSpanish = viewer.locale === "es";

  const batch = await db.historicalImportBatch.findUnique({
    where: { id: batchId },
    include: {
      student: { include: { user: true, assignment: { include: { teacher: { include: { user: true } } } } } },
      createdBy: true,
      rows: { orderBy: [{ status: "asc" }, { sourcePage: "asc" }] },
    },
  });

  if (!batch) notFound();

  const counts = batch.rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const closedStatuses: HistoricalImportRowStatus[] = [
    HistoricalImportRowStatus.APPLIED,
    HistoricalImportRowStatus.SKIPPED,
    HistoricalImportRowStatus.SOURCE_ONLY,
  ];

  return (
    <AppShell role={viewer.role} activePath="/admin/imports" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Revisión de importación" : "Import review"}
        title={batch.sourceFilename}
        description={isSpanish
          ? `Historial de ${batch.student.user.name}. Revisa cada sugerencia antes de aplicarla al progreso real.`
          : `${batch.student.user.name}'s history. Review each suggestion before applying it to real progress.`}
      >
        <Link href="/admin/imports">
          <Button variant="outline" size="sm">{isSpanish ? "Volver" : "Back"}</Button>
        </Link>
      </PageIntro>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <CardTitle>{isSpanish ? "Resumen del lote" : "Batch summary"}</CardTitle>
          <CardDescription>{batch.environmentNote}</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-[var(--color-ink-soft)]">
            <p><span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Estudiante" : "Student"}:</span> {batch.student.user.name}</p>
            <p><span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Docente" : "Teacher"}:</span> {batch.student.assignment?.teacher.user.name ?? (isSpanish ? "Sin asignar" : "Unassigned")}</p>
            <p><span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Páginas" : "Pages"}:</span> {batch.pageCount}</p>
            <p><span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Filas" : "Rows"}:</span> {batch.rows.length}</p>
            <p><span className="font-semibold text-[var(--color-ink)]">{isSpanish ? "Creado" : "Created"}:</span> {formatDate(batch.createdAt, viewer.locale)}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(counts).map(([status, count]) => (
              <Badge key={status} variant={status === "APPLIED" ? "success" : status === "ERROR" ? "danger" : "default"}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{isSpanish ? "Reglas de aplicación" : "Application rules"}</CardTitle>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--color-ink-soft)]">
            <p>{isSpanish ? "Las páginas amplias o sin fecha se guardan como notas históricas, no como clases falsas." : "Broad or undated pages are saved as historical notes, not fake classes."}</p>
            <p>{isSpanish ? "Las tareas históricas se marcan como revisadas para no aparecer como pendientes actuales." : "Historical assignments are marked reviewed so they do not appear as current pending work."}</p>
            <p>{isSpanish ? "Los exámenes con calificación se publican como reportes históricos visibles para estudiante/padre." : "Exams with grades are published as historical reports visible to the student/parent."}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{isSpanish ? "Filas extraídas" : "Extracted rows"}</CardTitle>
        <CardDescription>
          {isSpanish ? "Aplica primero filas de alta confianza. Usa “Solo fuente” para páginas de partitura o imágenes sin texto útil." : "Apply high-confidence rows first. Use “Source only” for sheet music or image pages without useful text."}
        </CardDescription>
        <div className="mt-5 space-y-3">
          {batch.rows.map((row) => {
            const closed = closedStatuses.includes(row.status);
            return (
              <div key={row.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="gold">{isSpanish ? "Página" : "Page"} {row.sourcePage}</Badge>
                      <Badge>{row.suggestedType}</Badge>
                      <Badge variant={row.status === "APPLIED" ? "success" : row.status === "ERROR" ? "danger" : "default"}>{row.status}</Badge>
                      <span className="text-xs text-[var(--color-ink-soft)]">{Math.round(row.confidence * 100)}% {isSpanish ? "confianza" : "confidence"}</span>
                    </div>
                    <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-[var(--color-ink-soft)]">
                      {row.rawText || (isSpanish ? "Sin texto extraíble. Requiere revisión visual/OCR." : "No extractable text. Needs visual/OCR review.")}
                    </p>
                    {row.appliedEntityType ? (
                      <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                        {isSpanish ? "Aplicado como" : "Applied as"}: {row.appliedEntityType} {row.appliedEntityId ? `· ${row.appliedEntityId}` : ""}
                      </p>
                    ) : null}
                    {row.errorMessage ? <p className="mt-2 text-xs text-rose-700">{row.errorMessage}</p> : null}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--color-gold-deep)]">
                        {isSpanish ? "Ver payload sugerido" : "View suggested payload"}
                      </summary>
                      <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-[var(--color-border)] bg-white/80 p-3 text-[11px] text-[var(--color-ink-soft)]">
                        {JSON.stringify(row.suggestedPayload, null, 2)}
                      </pre>
                    </details>
                  </div>
                  <HistoricalImportRowActions batchId={batch.id} rowId={row.id} disabled={closed} locale={viewer.locale} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}
