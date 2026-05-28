import { Role } from "@prisma/client";

import { AlegraAdminExplorer } from "@/components/invoices/alegra-admin-explorer";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getAlegraStudentContexts } from "@/lib/alegra/admin-context";
import { canUseAlegra } from "@/lib/alegra/client";
import { getDictionary } from "@/lib/i18n";

export default async function AdminAlegraPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);
  const isSpanish = viewer.locale === "es";
  const isConfigured = canUseAlegra();
  const students = await getAlegraStudentContexts();

  return (
    <AppShell role={viewer.role} activePath="/admin/alegra" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow="Alegra"
        title={isSpanish ? "Explora contactos, facturas y pagos de Alegra." : "Explore Alegra contacts, invoices, and payments."}
        description={isSpanish
          ? "Busca información en vivo para encontrar el contacto correcto y enlazarlo al estudiante o familia local. V1 es solo lectura contra Alegra."
          : "Search live data to find the correct contact and link it to the local student or family. V1 is read-only against Alegra."}
      />

      <Card>
        <CardTitle>{isSpanish ? "Centro de búsqueda Alegra" : "Alegra lookup center"}</CardTitle>
        <CardDescription>
          {isConfigured
            ? isSpanish
              ? "Usa esta sección para investigar contactos sin email, confirmar facturas/pagos y guardar el ID de contacto en el perfil local del estudiante."
              : "Use this section to investigate contacts without email, confirm invoices/payments, and save the contact ID on the local student profile."
            : isSpanish
              ? "Alegra aún no está configurado."
              : "Alegra is not configured yet."}
        </CardDescription>
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
          {isSpanish
            ? "El monitor de facturación sigue en Facturación; este explorador es para búsqueda y enlace manual."
            : "The invoice sync monitor remains under Billing; this explorer is for lookup and manual linking."}
        </p>
      </Card>

      {isConfigured ? (
        <AlegraAdminExplorer locale={viewer.locale} students={students} />
      ) : (
        <Card variant="subtle">
          <CardTitle>{dictionary.shell.nav.billing}</CardTitle>
          <CardDescription>
            {isSpanish
              ? "Configura ALEGRA_API_EMAIL y ALEGRA_API_TOKEN para activar búsquedas en vivo. No se mostrarán datos simulados en producción."
              : "Configure ALEGRA_API_EMAIL and ALEGRA_API_TOKEN to enable live lookup. No simulated data is shown in production."}
          </CardDescription>
        </Card>
      )}
    </AppShell>
  );
}
