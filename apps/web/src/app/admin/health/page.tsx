import Link from "next/link";
import type { ReactNode } from "react";
import { Role } from "@prisma/client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAdminHealthDashboardData, adminHealthCategories, adminHealthSeverities, type AdminHealthCategory, type AdminHealthIssue, type AdminHealthSeverity } from "@/lib/data/admin-health";
import { formatDateTimeInZone } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHealthPage({ searchParams }: PageProps) {
  const viewer = await requireViewer([Role.ADMIN]);
  const params = await searchParams;
  const isSpanish = viewer.locale === "es";
  const severity = parseSeverity(singleParam(params?.severity));
  const category = parseCategory(singleParam(params?.category));
  const limit = parseLimit(singleParam(params?.limit));
  const data = await getAdminHealthDashboardData({ severity, category, limit });
  const visibleByCategory = adminHealthCategories
    .map((item) => ({ category: item, issues: data.issues.filter((issue) => issue.category === item) }))
    .filter((section) => section.issues.length > 0);

  return (
    <AppShell role={viewer.role} activePath="/admin/health" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Salud operativa" : "Operational health"}
        title={isSpanish ? "Riesgos antes de que se vuelvan urgencias." : "Risks before they become emergencies."}
        description={isSpanish
          ? "Monitorea estudiantes, agenda, consentimientos, correos, facturación y seguridad desde una vista administrativa de solo lectura."
          : "Monitor students, scheduling, consent, email, billing, and security from one read-only admin view."}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="gold">{isSpanish ? "Solo lectura" : "Read-only"}</Badge>
          <Badge>{isSpanish ? "Actualizado" : "Updated"}: {formatDateTimeInZone(data.generatedAt, viewer.timezone, viewer.locale)}</Badge>
        </div>
      </PageIntro>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={isSpanish ? "Resumen de salud" : "Health summary"}>
        <MetricCard title={isSpanish ? "Críticos" : "Critical"} value={String(data.counts.critical)} subtitle={isSpanish ? "Bloqueos o riesgos altos" : "Blockers or high risk"} />
        <MetricCard title={isSpanish ? "Alertas" : "Warnings"} value={String(data.counts.warning)} subtitle={isSpanish ? "Necesitan seguimiento" : "Need follow-up"} />
        <MetricCard title={isSpanish ? "Revisión" : "Needs review"} value={String(data.counts.review)} subtitle={isSpanish ? "Confirmar datos" : "Confirm data"} />
        <MetricCard title={isSpanish ? "Total" : "Total issues"} value={String(data.counts.total)} subtitle={data.totalMatchingIssues > data.issues.length ? (isSpanish ? `Mostrando ${data.issues.length} de ${data.totalMatchingIssues}` : `Showing ${data.issues.length} of ${data.totalMatchingIssues}`) : (isSpanish ? "Según filtros actuales" : "For current filters")} />
      </section>

      <Card variant="subtle" density="compact">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>{isSpanish ? "Filtros" : "Filters"}</CardTitle>
            <CardDescription>
              {isSpanish
                ? `Inactividad: ${data.thresholds.inactivityDays} días · intentos fallidos: ${data.thresholds.failedLoginLookbackHours} horas · apagones: ${data.thresholds.blackoutLookaheadDays} días.`
                : `Inactivity: ${data.thresholds.inactivityDays} days · failed logins: ${data.thresholds.failedLoginLookbackHours} hours · blackouts: ${data.thresholds.blackoutLookaheadDays} days.`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip href={healthHref({ category, limit })} active={!severity}>{isSpanish ? "Todas" : "All"}</FilterChip>
            {adminHealthSeverities.map((item) => (
              <FilterChip key={item} href={healthHref({ severity: item, category, limit })} active={severity === item}>
                {severityLabel(item, isSpanish)}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip href={healthHref({ severity, limit })} active={!category}>{isSpanish ? "Todas las áreas" : "All areas"}</FilterChip>
          {adminHealthCategories.map((item) => (
            <FilterChip key={item} href={healthHref({ severity, category: item, limit })} active={category === item}>
              {categoryLabel(item, isSpanish)}
            </FilterChip>
          ))}
        </div>
      </Card>

      {data.issues.length === 0 ? (
        <Card className="text-center">
          <CardTitle>{isSpanish ? "No hay riesgos visibles con estos filtros." : "No visible risks for these filters."}</CardTitle>
          <CardDescription>
            {isSpanish
              ? "La vista de salud no encontró alertas en las reglas actuales. Buen silencio, del tipo que nos gusta."
              : "The health view did not find alerts for the current rules. Good silence, the kind we like."}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-5">
          {visibleByCategory.map((section) => (
            <IssueSection key={section.category} category={section.category} issues={section.issues} isSpanish={isSpanish} viewerTimezone={viewer.timezone} locale={viewer.locale} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function IssueSection({ category, issues, isSpanish, viewerTimezone, locale }: { category: AdminHealthCategory; issues: AdminHealthIssue[]; isSpanish: boolean; viewerTimezone: string; locale: "en" | "es" }) {
  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>{categoryLabel(category, isSpanish)}</CardTitle>
          <CardDescription>{sectionDescription(category, isSpanish)}</CardDescription>
        </div>
        <Badge variant="gold">{issues.length}</Badge>
      </div>
      <div className="mt-5 grid gap-3">
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} isSpanish={isSpanish} viewerTimezone={viewerTimezone} locale={locale} />
        ))}
      </div>
    </Card>
  );
}

function IssueRow({ issue, isSpanish, viewerTimezone, locale }: { issue: AdminHealthIssue; isSpanish: boolean; viewerTimezone: string; locale: "en" | "es" }) {
  return (
    <div className="grid gap-3 rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4 shadow-[0_10px_28px_rgba(68,47,27,0.035)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-gold)_26%,var(--color-border))] hover:bg-[var(--color-surface-hover)] md:grid-cols-[0.8fr_1.4fr_auto] md:items-start">
      <div>
        <Badge variant={severityVariant(issue.severity)}>{severityLabel(issue.severity, isSpanish)}</Badge>
        {issue.occurredAt ? <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{formatDateTimeInZone(issue.occurredAt, viewerTimezone, locale)}</p> : null}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{localizedIssueTitle(issue.title, isSpanish)}</p>
        <p className="mt-1 truncate text-base font-semibold text-[var(--color-ink)]">{issue.subject}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{localizedIssueDescription(issue.description, isSpanish)}</p>
        {issue.meta ? <p className="mt-2 break-words text-xs font-medium text-[var(--color-ink-muted)]">{issue.meta}</p> : null}
      </div>
      <Link
        href={issue.href}
        className="inline-flex h-10 items-center justify-center rounded-[1.05rem] border border-[var(--color-border-strong)] bg-[var(--color-surface-glass)] px-4 text-sm font-semibold text-[var(--color-ink)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-gold)_38%,white)] hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {isSpanish ? "Revisar" : "Review"}
      </Link>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:outline-none",
        active
          ? "border-[color-mix(in_srgb,var(--color-gold)_30%,white)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[var(--shadow-active)]"
          : "border-[var(--color-border)] bg-white/72 text-[var(--color-ink-soft)] hover:border-[color-mix(in_srgb,var(--color-gold)_28%,white)] hover:text-[var(--color-gold-deep)]",
      )}
    >
      {children}
    </Link>
  );
}

function parseSeverity(value: string | undefined): AdminHealthSeverity | undefined {
  return adminHealthSeverities.includes(value as AdminHealthSeverity) ? value as AdminHealthSeverity : undefined;
}

function parseCategory(value: string | undefined): AdminHealthCategory | undefined {
  return adminHealthCategories.includes(value as AdminHealthCategory) ? value as AdminHealthCategory : undefined;
}

function parseLimit(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function healthHref(input: { severity?: AdminHealthSeverity; category?: AdminHealthCategory; limit?: number }) {
  const params = new URLSearchParams();
  if (input.severity) params.set("severity", input.severity);
  if (input.category) params.set("category", input.category);
  if (input.limit && input.limit !== 80) params.set("limit", String(input.limit));
  const query = params.toString();
  return query ? `/admin/health?${query}` : "/admin/health";
}

function severityVariant(severity: AdminHealthSeverity) {
  if (severity === "critical") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  return "default" as const;
}

function severityLabel(severity: AdminHealthSeverity, isSpanish: boolean) {
  if (severity === "critical") return isSpanish ? "Crítico" : "Critical";
  if (severity === "warning") return isSpanish ? "Alerta" : "Warning";
  return isSpanish ? "Revisión" : "Needs review";
}

function categoryLabel(category: AdminHealthCategory, isSpanish: boolean) {
  const labels: Record<AdminHealthCategory, string> = isSpanish
    ? {
        students: "Estudiantes",
        consent: "Consentimientos",
        email: "Correos",
        schedule: "Agenda",
        billing: "Facturación",
        security: "Seguridad",
      }
    : {
        students: "Students",
        consent: "Consent",
        email: "Email",
        schedule: "Schedule",
        billing: "Billing",
        security: "Security",
      };
  return labels[category];
}

function sectionDescription(category: AdminHealthCategory, isSpanish: boolean) {
  const descriptions: Record<AdminHealthCategory, string> = isSpanish
    ? {
        students: "Asignaciones, actividad y datos base de estudiantes.",
        consent: "Firmas requeridas para el documento activo.",
        email: "Entregas fallidas u omitidas en el registro de correos.",
        schedule: "Conflictos operativos de agenda y disponibilidad.",
        billing: "Configuración de cobros, facturas y créditos de clase.",
        security: "Intentos de acceso repetidos o sospechosos.",
      }
    : {
        students: "Assignments, activity, and core student data.",
        consent: "Required signatures for the active consent document.",
        email: "Failed or skipped delivery records in the email log.",
        schedule: "Operational scheduling and availability conflicts.",
        billing: "Billing setup, invoices, and class credit balances.",
        security: "Repeated or suspicious sign-in attempts.",
      };
  return descriptions[category];
}

function localizedIssueTitle(title: string, isSpanish: boolean) {
  if (!isSpanish) return title;
  const labels: Record<string, string> = {
    "Missing teacher assignment": "Falta asignación docente",
    "No active consent document": "No hay consentimiento activo",
    "Missing active consent": "Falta consentimiento activo",
    "Student inactivity": "Inactividad del estudiante",
    "Failed email delivery": "Correo fallido",
    "Skipped email delivery": "Correo omitido",
    "Scheduled class on blackout date": "Clase en día bloqueado",
    "Missing billing profile": "Falta perfil de facturación",
    "Missing active class allowance": "Falta cupo mensual activo",
    "Missing primary parent/guardian": "Falta acudiente principal",
    "Open invoice is overdue": "Factura abierta vencida",
    "Invoice email failed": "Correo de factura falló",
    "Negative class-credit balance": "Saldo de créditos negativo",
    "Repeated failed logins by email": "Fallos de acceso repetidos por correo",
    "Repeated failed logins by IP": "Fallos de acceso repetidos por IP",
    "Invalid timezone": "Zona horaria inválida",
    "Timezone uses app fallback": "Zona horaria por defecto",
  };
  return labels[title] ?? title;
}

function localizedIssueDescription(description: string, isSpanish: boolean) {
  if (!isSpanish) return description;
  const labels: Record<string, string> = {
    "This student has no assigned teacher, so scheduling, progress, and communication workflows may stall.": "Este estudiante no tiene docente asignado; agenda, progreso y comunicación pueden quedar detenidos.",
    "No active consent document is configured, so consent completion cannot be verified.": "No hay documento de consentimiento activo, por eso no se puede verificar la firma requerida.",
    "No class, lesson note, practice log, video, or message activity was found in the last 30 days.": "No se encontró clase, nota, práctica, video ni mensaje en los últimos 30 días.",
    "A future scheduled class falls on a teacher blackout date. Existing classes are not automatically cancelled.": "Una clase futura cae en un día bloqueado del docente. Las clases existentes no se cancelan automáticamente.",
    "Native invoice defaults are missing, so monthly draft generation may need manual values.": "Faltan valores por defecto de facturación nativa; los borradores mensuales pueden requerir datos manuales.",
    "No active internal class allowance/subscription is recorded for this student.": "No hay cupo mensual o suscripción interna activa para este estudiante.",
    "Invoices are parent-facing when a primary parent is linked. Confirm whether this student needs a guardian billing contact.": "Las facturas se muestran al acudiente cuando hay uno principal. Confirma si este estudiante necesita contacto de facturación.",
    "This invoice is open and past its due date.": "Esta factura está abierta y vencida.",
    "The invoice email delivery failed and may need to be resent manually.": "El correo de la factura falló y puede requerir reenvío manual.",
    "This student has consumed more class credits than have been granted. Review invoices, credits, or manual adjustments.": "Este estudiante consumió más créditos de los otorgados. Revisa facturas, créditos o ajustes manuales.",
    "This user has an invalid saved timezone. Scheduling displays may fall back to the default timezone.": "Este usuario tiene una zona horaria inválida. La agenda puede usar la zona por defecto.",
    "This user is still using the default scheduling timezone. Confirm it is intentional before regular scheduling begins.": "Este usuario sigue usando la zona horaria por defecto. Confirma que sea intencional antes de agendar con regularidad.",
  };
  return labels[description] ?? description;
}
