import { Role } from "@prisma/client";

import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { changelogEntries } from "@/lib/changelog";
import { formatDate } from "@/lib/i18n";

export default async function AdminChangelogPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const isSpanish = viewer.locale === "es";
  const latest = changelogEntries[0];
  const totalChanges = changelogEntries.reduce(
    (total, entry) => total + entry.sections.reduce((sectionTotal, section) => sectionTotal + section.items.length, 0),
    0,
  );

  return (
    <AppShell role={viewer.role} activePath="/admin/changelog" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Historial de producto" : "Product history"}
        title={isSpanish ? "Registro de cambios de Harmonizing." : "Harmonizing changelog."}
        description={
          isSpanish
            ? "Consulta las versiones publicadas, fechas y mejoras clave del portal desde la administración."
            : "Review shipped versions, dates, and key portal improvements from the admin workspace."
        }
      />

      <div className="card-grid">
        <Card>
          <CardDescription>{isSpanish ? "Versión actual" : "Current version"}</CardDescription>
          <p className="mt-2 font-display text-4xl tracking-[-0.05em] text-[var(--color-ink)]">v{latest.version}</p>
        </Card>
        <Card>
          <CardDescription>{isSpanish ? "Lanzamientos registrados" : "Tracked releases"}</CardDescription>
          <p className="mt-2 font-display text-4xl tracking-[-0.05em] text-[var(--color-ink)]">{changelogEntries.length}</p>
        </Card>
        <Card>
          <CardDescription>{isSpanish ? "Cambios documentados" : "Documented changes"}</CardDescription>
          <p className="mt-2 font-display text-4xl tracking-[-0.05em] text-[var(--color-ink)]">{totalChanges}</p>
        </Card>
      </div>

      <div className="space-y-4">
        {changelogEntries.map((entry) => (
          <Card key={entry.version} className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>v{entry.version}</CardTitle>
                  {entry.version === latest.version ? <Badge variant="gold">{isSpanish ? "Actual" : "Current"}</Badge> : null}
                </div>
                <CardDescription>
                  {formatDate(`${entry.date}T12:00:00.000Z`, viewer.locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </div>
              <Badge>{entry.date}</Badge>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {entry.sections.map((section) => (
                <section key={`${entry.version}-${section.title}`}>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-gold-deep)] uppercase">
                    {sectionLabel(section.title, isSpanish)}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 rounded-[1.1rem] border border-[var(--color-border)] bg-white/68 px-3 py-2.5 text-sm leading-6 text-[var(--color-ink-soft)]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-gold)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function sectionLabel(title: string, isSpanish: boolean) {
  if (!isSpanish) return title;
  if (title === "Added") return "Agregado";
  if (title === "Changed") return "Cambiado";
  return title;
}
