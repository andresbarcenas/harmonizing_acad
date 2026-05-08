import { AppShell } from "@/components/ui/app-shell";
import { ProfileImageForm } from "@/components/auth/profile-image-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguagePreferenceForm } from "@/components/i18n/language-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { buildWhatsAppPlanLink } from "@/lib/whatsapp";

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const dictionary = getDictionary(viewer.locale);

  return (
    <AppShell role={viewer.role} activePath="/settings" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.settings.eyebrow}
        title={dictionary.settings.title}
        description={dictionary.settings.description}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>{dictionary.settings.profile}</CardTitle>
          <CardDescription>{viewer.email}</CardDescription>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">{dictionary.settings.detectedTimezone}: {viewer.timezone}</p>
          <LanguagePreferenceForm locale={viewer.locale} />
          <ProfileImageForm initialImage={viewer.image} userName={viewer.name} locale={viewer.locale} />
          <div className="mt-4">
            <SignOutButton label={dictionary.common.signOut} />
          </div>
        </Card>

        <Card>
          <CardTitle>{dictionary.settings.planSupport}</CardTitle>
          <CardDescription>{dictionary.settings.planSupportDescription}</CardDescription>
          <div className="mt-4">
            <a href={buildWhatsAppPlanLink()} target="_blank" rel="noreferrer">
              <Button variant="gold">{dictionary.common.managePlan}</Button>
            </a>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
