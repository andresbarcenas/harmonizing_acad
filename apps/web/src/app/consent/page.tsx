import Link from "next/link";
import { Role } from "@prisma/client";

import { BrandLogo } from "@/components/brand/logo";
import { ConsentSigningForm } from "@/components/consent/consent-signing-form";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { getConsentStatusForStudent, getConsentStatusForUser } from "@/lib/consent/service";
import { getDictionary } from "@/lib/i18n";
import { resolveParentStudentSelection } from "@/lib/parents";

export default async function ConsentPage({ searchParams }: { searchParams?: Promise<{ studentId?: string }> }) {
  const viewer = await requireViewer([Role.STUDENT, Role.PARENT], { skipConsent: true });
  const dictionary = getDictionary(viewer.locale);
  const params = await searchParams;
  const parentSelection = viewer.role === Role.PARENT
    ? await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId)
    : null;
  const coveredStudentId = viewer.role === Role.PARENT ? parentSelection?.selectedStudentId : viewer.studentProfileId;
  const coveredStudent = viewer.role === Role.PARENT ? parentSelection?.selectedLink?.student : null;
  const isSpanish = viewer.locale === "es";

  if (viewer.role === Role.PARENT && !coveredStudentId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-white/84 p-4 shadow-[var(--shadow-card)] backdrop-blur-[18px] sm:flex-row sm:items-center sm:justify-between">
          <Link href="/consent" className="w-fit">
            <BrandLogo compact={false} subtitle={dictionary.shell.brandSubtitle} />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle locale={viewer.locale} authenticated compact />
            <SignOutButton compact label={dictionary.common.signOut} />
          </div>
        </header>
        <Card>
          <CardTitle>{isSpanish ? "Aún no hay estudiantes vinculados." : "No linked students yet."}</CardTitle>
          <CardDescription>{isSpanish ? "Administración puede vincular un estudiante a esta cuenta familiar para firmar el consentimiento." : "An admin can link a student to this family account before consent can be signed."}</CardDescription>
        </Card>
      </main>
    );
  }

  const status = coveredStudentId ? await getConsentStatusForStudent(coveredStudentId) : await getConsentStatusForUser(viewer.id);
  const continueHref = viewer.role === Role.PARENT && coveredStudentId ? `/parent/dashboard?studentId=${coveredStudentId}` : "/dashboard";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-8">
      <header className="flex flex-col gap-4 rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-white/84 p-4 shadow-[var(--shadow-card)] backdrop-blur-[18px] sm:flex-row sm:items-center sm:justify-between">
        <Link href="/consent" className="w-fit">
          <BrandLogo compact={false} subtitle={dictionary.shell.brandSubtitle} />
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
        studentId={viewer.role === Role.PARENT ? coveredStudentId ?? undefined : undefined}
        studentEmail={coveredStudent?.user.email ?? viewer.email}
        studentName={coveredStudent?.user.name}
        continueHref={continueHref}
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
