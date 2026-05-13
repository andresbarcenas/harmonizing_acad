import { Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default async function AdminHistoricalImportsPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const isSpanish = viewer.locale === "es";
  const batches = await db.historicalImportBatch.findMany({
    include: {
      student: { include: { user: true } },
      createdBy: true,
      _count: { select: { rows: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/imports" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Importación histórica" : "Historical import"}
        title={isSpanish ? "Digitaliza el historial musical sin perder contexto." : "Digitize music history without losing context."}
        description={isSpanish
          ? "Revisa PDFs antiguos, valida las sugerencias y aplica solo los datos confiables al progreso real del estudiante."
          : "Review old PDFs, validate suggestions, and apply only trustworthy records into student progress."}
      />

      <Card>
        <CardTitle>{isSpanish ? "Importar historial de un estudiante" : "Import a student's history"}</CardTitle>
        <CardDescription>
          {isSpanish
            ? "Ejecuta este comando en local para extraer cualquier PDF histórico a una cola de revisión. No aplica datos al perfil hasta que administración apruebe filas."
            : "Run this locally to extract any historical PDF into a review queue. It does not apply records until an admin approves rows."}
        </CardDescription>
        <pre className="mt-4 overflow-x-auto rounded-[1.2rem] border border-[var(--color-border)] bg-white/76 p-4 text-xs text-[var(--color-ink)]">
          <code>{`npm run import:student-history -- \\
  --student-email "student@example.com" \\
  --student-name "Student Name" \\
  --teacher-email "maria@harmonizing.com" \\
  --instrument "Piano" \\
  --pdf "/imports/student-history.pdf"`}</code>
        </pre>
        <p className="mt-3 text-xs leading-5 text-[var(--color-ink-soft)]">
          {isSpanish
            ? "Usa --dry-run para ver el resumen sin escribir en base de datos. Para el piloto de Tommy puedes usar npm run import:tommy-history."
            : "Use --dry-run to preview without writing to the database. For the Tommy pilot, you can use npm run import:tommy-history."}
        </p>
      </Card>

      <Card>
        <CardTitle>{isSpanish ? "Lotes recientes" : "Recent batches"}</CardTitle>
        <div className="mt-4 space-y-3">
          {batches.map((batch) => (
            <a
              key={batch.id}
              href={`/admin/imports/${batch.id}`}
              aria-label={isSpanish ? `Abrir importación de ${batch.student.user.name}` : `Open import for ${batch.student.user.name}`}
              className="group block rounded-[1.2rem] border border-[var(--color-border)] bg-white/70 px-4 py-3 transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:bg-white/86 focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{batch.sourceFilename}</p>
                    <Badge variant={batch.status === "APPLIED" ? "success" : batch.status === "FAILED" ? "danger" : "gold"}>{batch.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {batch.student.user.name} · {batch.pageCount} {isSpanish ? "páginas" : "pages"} · {batch._count.rows} {isSpanish ? "filas" : "rows"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {isSpanish ? "Creado" : "Created"}: {formatDate(batch.createdAt, viewer.locale)} · {batch.createdBy?.name ?? "Admin"}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex h-9 w-fit items-center justify-center rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/74 px-3 text-xs font-semibold text-[var(--color-ink)] shadow-[0_8px_22px_rgba(80,58,32,0.05)] transition-all duration-200 group-hover:border-[color-mix(in_srgb,var(--color-gold)_40%,white)] group-hover:bg-[var(--color-gold-soft)]/55",
                  )}
                >
                  {isSpanish ? "Abrir vista previa" : "Open preview"}
                </span>
              </div>
            </a>
          ))}
          {!batches.length ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-white/50 px-4 py-5 text-sm text-[var(--color-ink-soft)]">
              {isSpanish ? "Aún no hay lotes importados." : "No import batches yet."}
            </p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
