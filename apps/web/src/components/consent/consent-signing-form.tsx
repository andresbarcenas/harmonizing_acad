"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AppLocale } from "@/lib/i18n/locales";

type ConsentSigningFormProps = {
  locale: AppLocale;
  studentEmail: string;
  document: {
    version: string;
    titleEn: string;
    titleEs: string;
    bodyEn: string;
    bodyEs: string;
  };
  existingSignature?: {
    id: string;
    signerName: string;
    signedAt: string;
    emailStatus: string;
  } | null;
};

export function ConsentSigningForm({ locale, studentEmail, document, existingSignature }: ConsentSigningFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [signerName, setSignerName] = useState(existingSignature?.signerName ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const isSpanish = locale === "es";

  const copy = useMemo(() => ({
    signedTitle: isSpanish ? "Consentimiento firmado" : "Consent signed",
    signedDescription: isSpanish
      ? "Tu cuenta ya tiene el consentimiento activo. Puedes descargar la copia firmada o continuar."
      : "Your account already has the active consent. You can download the signed copy or continue.",
    continue: isSpanish ? "Continuar al portal" : "Continue to portal",
    download: isSpanish ? "Descargar PDF firmado" : "Download signed PDF",
    signerName: isSpanish ? "Nombre legal completo de madre/padre/tutor" : "Parent/guardian full legal name",
    relationship: isSpanish ? "Relación con el estudiante" : "Relationship to student",
    signerEmail: isSpanish ? "Email para recibir la copia PDF" : "Email to receive PDF copy",
    acknowledge: isSpanish
      ? "Confirmo que leí el consentimiento en español e inglés, tengo autoridad para firmar por el estudiante y acepto el uso de registros electrónicos."
      : "I confirm that I read the consent in Spanish and English, I have authority to sign for the student, and I agree to electronic records.",
    submit: isSpanish ? "Firmar consentimiento" : "Sign consent",
    submitting: isSpanish ? "Firmando..." : "Signing...",
    signaturePreview: isSpanish ? "Vista de firma" : "Signature preview",
    legalNote: isSpanish
      ? "Al firmar, el acceso del estudiante se habilita y enviaremos una copia PDF al email indicado."
      : "After signing, student access is enabled and we will email a PDF copy to the address provided.",
    error: isSpanish ? "No se pudo firmar el consentimiento." : "Could not sign the consent.",
  }), [isSpanish]);

  if (existingSignature) {
    return (
      <Card>
        <CardTitle>{copy.signedTitle}</CardTitle>
        <CardDescription>{copy.signedDescription}</CardDescription>
        <div className="mt-4 rounded-[1.4rem] border border-[var(--color-border)] bg-white/72 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{copy.signaturePreview}</p>
          <p className="font-signature mt-2 text-5xl leading-none text-[var(--color-ink)]">{existingSignature.signerName}</p>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
            {new Date(existingSignature.signedAt).toLocaleDateString(isSpanish ? "es-US" : "en-US", { dateStyle: "medium" })} · {existingSignature.emailStatus}
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a href={`/api/consent/signatures/${existingSignature.id}/pdf`} className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto">{copy.download}</Button>
          </a>
          <Button type="button" variant="gold" onClick={() => router.push("/dashboard")}>{copy.continue}</Button>
        </div>
      </Card>
    );
  }

  async function submitConsent(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/consent/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: String(formData.get("signerName") ?? ""),
          signerRelationship: String(formData.get("signerRelationship") ?? ""),
          signerEmail: String(formData.get("signerEmail") ?? ""),
          acknowledged,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? copy.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.72fr)]">
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-gold-deep)]">{document.version}</p>
          <CardTitle className="mt-2 font-display text-3xl font-normal tracking-[-0.04em]">{document.titleEs}</CardTitle>
          <CardDescription>{document.titleEn}</CardDescription>
        </div>
        <ConsentText title="Español" body={document.bodyEs} />
        <ConsentText title="English" body={document.bodyEn} />
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardTitle>{copy.submit}</CardTitle>
        <CardDescription>{copy.legalNote}</CardDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitConsent(new FormData(event.currentTarget));
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label className="text-sm font-semibold text-[var(--color-ink-soft)]" htmlFor="signerName">{copy.signerName}</label>
            <Input id="signerName" name="signerName" value={signerName} onChange={(event) => setSignerName(event.target.value)} required autoComplete="name" />
          </div>
          <div>
            <label className="text-sm font-semibold text-[var(--color-ink-soft)]" htmlFor="signerRelationship">{copy.relationship}</label>
            <Input id="signerRelationship" name="signerRelationship" placeholder={isSpanish ? "Madre, padre o tutor legal" : "Mother, father, or legal guardian"} required />
          </div>
          <div>
            <label className="text-sm font-semibold text-[var(--color-ink-soft)]" htmlFor="signerEmail">{copy.signerEmail}</label>
            <Input id="signerEmail" name="signerEmail" type="email" defaultValue={studentEmail} required autoComplete="email" />
          </div>

          <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/72 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{copy.signaturePreview}</p>
            <p className="font-signature mt-3 min-h-16 break-words text-5xl leading-none text-[var(--color-ink)]">
              {signerName || "Nombre completo"}
            </p>
          </div>

          <label className="flex gap-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/64 p-4 text-sm leading-6 text-[var(--color-ink-soft)]">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-gold)]"
            />
            <span>{copy.acknowledge}</span>
          </label>

          <Button type="submit" variant="gold" className="w-full" disabled={isPending || !acknowledged}>
            {isPending ? copy.submitting : copy.submit}
          </Button>
          {message ? <p className="text-sm text-rose-700">{message}</p> : null}
        </form>
      </Card>
    </div>
  );
}

function ConsentText({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{title}</p>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--color-ink-soft)]">
        {body.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
