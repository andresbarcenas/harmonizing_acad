import { AppShell } from "@/components/ui/app-shell";
import { ProfileImageForm } from "@/components/auth/profile-image-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { buildWhatsAppPlanLink } from "@/lib/whatsapp";

export default async function SettingsPage() {
  const viewer = await requireViewer();

  return (
    <AppShell role={viewer.role} activePath="/settings" userName={viewer.name}>
      <PageIntro
        eyebrow="Perfil y soporte"
        title="Tus preferencias, acceso y plan en un solo lugar."
        description="Consulta la configuración esencial de tu cuenta y entra en contacto con el equipo cuando necesites ayuda con tu membresía."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>{viewer.email}</CardDescription>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">Zona horaria detectada: {viewer.timezone}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Idioma principal: Español</p>
          <ProfileImageForm initialImage={viewer.image} userName={viewer.name} />
          <div className="mt-4">
            <SignOutButton />
          </div>
        </Card>

        <Card>
          <CardTitle>Plan y soporte</CardTitle>
          <CardDescription>Gestión manual de plan por WhatsApp.</CardDescription>
          <div className="mt-4">
            <a href={buildWhatsAppPlanLink()} target="_blank" rel="noreferrer">
              <Button variant="gold">Gestionar mi plan</Button>
            </a>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
