import { AppShell } from "@/components/ui/app-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { buildWhatsAppPlanLink } from "@/lib/whatsapp";

export default async function SettingsPage() {
  const viewer = await requireViewer();

  return (
    <AppShell role={viewer.role} activePath="/settings" userName={viewer.name}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>{viewer.email}</CardDescription>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">Zona horaria detectada: {viewer.timezone}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Idioma principal: Español</p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </Card>

        <Card>
          <CardTitle>Plan y soporte</CardTitle>
          <CardDescription>Gestión manual de plan por WhatsApp.</CardDescription>
          <div className="mt-4">
            <a href={buildWhatsAppPlanLink()} target="_blank" rel="noreferrer">
              <Button variant="gold">Manage my plan</Button>
            </a>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
