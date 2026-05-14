"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locales";

export function SignInForm({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [magicSubmitting, setMagicSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setMagicMessage(null);
    setPreviewUrl(null);
    setSubmitting(true);
    const emailValue = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!emailValue || !password) {
      setError(dictionary.auth.missing);
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email: emailValue,
      password,
      redirect: false,
    });

    if (result?.error || !result?.ok) {
      // Security-sensitive: keep message generic to avoid leaking whether an email exists.
      setError(dictionary.auth.invalid);
      setSubmitting(false);
      return;
    }

    startTransition(() => {
      router.push("/");
      router.refresh();
    });
    setSubmitting(false);
  }

  async function requestMagicLink() {
    setError(null);
    setMagicMessage(null);
    setPreviewUrl(null);
    const emailValue = email.trim();

    if (!emailValue) {
      setError(dictionary.auth.magicLinkMissingEmail);
      return;
    }

    setMagicSubmitting(true);
    try {
      const response = await fetch("/api/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? dictionary.auth.magicLinkError);
        return;
      }
      setMagicMessage(dictionary.auth.magicLinkSent);
      if (payload.previewUrl) setPreviewUrl(payload.previewUrl);
    } catch {
      setError(dictionary.auth.magicLinkError);
    } finally {
      setMagicSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-base font-semibold text-[var(--color-ink-soft)]">{dictionary.auth.email}</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input
            type="email"
            name="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="pl-12"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-base font-semibold text-[var(--color-ink-soft)]">{dictionary.auth.password}</label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input type="password" name="password" placeholder="••••••••" required className="pl-12" />
        </div>
      </div>
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      {magicMessage ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-gold)_30%,white)] bg-[var(--color-gold-soft)]/55 px-4 py-3 text-sm leading-6 text-[var(--color-ink-soft)]">
          <p>{magicMessage}</p>
          {previewUrl ? (
            <Link href={previewUrl} className="mt-2 block font-semibold text-[var(--color-gold-deep)] underline-offset-4 hover:underline">
              {dictionary.auth.magicLinkPreview}
            </Link>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" variant="gold" size="lg" className="w-full gap-2" disabled={isPending || submitting}>
        {isPending || submitting ? dictionary.auth.submitting : dictionary.common.signIn}
        {!isPending && !submitting ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
      <div className="space-y-2 rounded-[1.4rem] border border-[var(--color-border)] bg-white/58 p-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-2"
          disabled={magicSubmitting || submitting}
          onClick={requestMagicLink}
        >
          {magicSubmitting ? dictionary.auth.magicLinkSending : dictionary.auth.magicLinkButton}
          {!magicSubmitting ? <KeyRound className="h-4 w-4" /> : null}
        </Button>
        <p className="px-1 text-center text-xs leading-5 text-[var(--color-ink-soft)]">{dictionary.auth.magicLinkHelp}</p>
      </div>
      <Link
        href="/forgot-password"
        className="block pt-1 text-center text-sm font-semibold text-[var(--color-gold-deep)] transition hover:text-[var(--color-gold)]"
      >
        {dictionary.auth.forgot}
      </Link>
    </form>
  );
}
