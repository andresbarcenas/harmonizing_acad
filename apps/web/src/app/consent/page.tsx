import Link from "next/link";
import { Role } from "@prisma/client";

import { BrandLogo } from "@/components/brand/logo";
import { ConsentSigningForm } from "@/components/consent/consent-signing-form";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { getConsentStatusForUser } from "@/lib/consent/service";
import { getDictionary } from "@/lib/i18n";

export default async function ConsentPage() {
  const viewer = await requireViewer([Role.STUDENT], { skipConsent: true });
  const dictionary = getDictionary(viewer.locale);
  const status = await getConsentStatusForUser(viewer.id);
  const isSpanish = viewer.locale === "es";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-8">
      <header className="flex flex-col gap-4 rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-white/84 p-4 shadow-[var(--shadow-card)] backdrop-blur-[18px] sm:flex-row sm:items-center sm:justify-between">
        <Link href="/consent" className="w-fit">
          <BrandLogo compact={false} />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle locale={viewer.locale} authenticated compact />
          <SignOutButton compact label={dictionary.common.signOut} />
        </div>
      </header>

      <section className="page-hero">
        <p className="page-eyebrow">{isSpanish ? "Privacidad y medios" : "Privacy and media"}</p>
        <h1 className="page-title">{isSpanish ? "Firma el consentimiento para activar el portal del estudiante." : "Sign consent to activate the student portal."}</h1>
        <p className="page-copy">
          {isSpanish
            ? "Como la academia recopila videos, notas y progreso musical, necesitamos una firma de madre, padre o tutor antes de habilitar las funciones del estudiante."
            : "Because the academy collects videos, notes, and music progress, we need a parent or guardian signature before enabling student features."}
        </p>
      </section>

      <Card>
        <CardTitle>{isSpanish ? "Qué pasa hasta firmar" : "What happens until signing"}</CardTitle>
        <CardDescription>
          {isSpanish
            ? "El acceso del estudiante a agenda, videos, progreso, mensajes y operaciones del portal queda pausado. Docentes y administración pueden seguir gestionando la academia."
            : "Student access to schedule, videos, progress, messages, and portal operations stays paused. Teachers and admins can continue managing the academy."}
        </CardDescription>
      </Card>

      <ConsentSigningForm
        locale={viewer.locale}
        studentEmail={viewer.email}
        document={{
          version: status.document.version,
          titleEn: status.document.titleEn,
          titleEs: status.document.titleEs,
          bodyEn: status.document.bodyEn,
          bodyEs: status.document.bodyEs,
        }}
        existingSignature={status.signature ? {
          id: status.signature.id,
          signerName: status.signature.signerName,
          signedAt: status.signature.signedAt.toISOString(),
          emailStatus: status.signature.emailStatus,
        } : null}
      />
    </main>
  );
}
