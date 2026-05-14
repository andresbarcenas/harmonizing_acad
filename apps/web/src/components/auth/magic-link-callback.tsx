"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locales";

export function MagicLinkCallback({ email, token, locale }: { email?: string; token?: string; locale: AppLocale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function redeem() {
      if (!email || !token) {
        setError(dictionary.auth.magicLinkInvalid);
        return;
      }

      const result = await signIn("magic-link", {
        email,
        token,
        redirect: false,
      });

      if (cancelled) return;

      if (result?.error || !result?.ok) {
        setError(dictionary.auth.magicLinkInvalid);
        return;
      }

      startTransition(() => {
        router.replace("/");
        router.refresh();
      });
    }

    redeem();
    return () => {
      cancelled = true;
    };
  }, [dictionary.auth.magicLinkInvalid, email, router, token]);

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/80 text-[var(--color-gold)] shadow-[var(--shadow-glow)]">
        <KeyRound className="h-5 w-5" />
      </div>
      <div>
        <h1 className="font-display text-[2rem] tracking-[-0.04em] text-[var(--color-ink)] sm:text-[2.5rem]">
          {error ? dictionary.auth.magicLinkErrorTitle : dictionary.auth.magicLinkCheckingTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">
          {error ?? dictionary.auth.magicLinkCheckingDescription}
        </p>
      </div>
      {error ? (
        <Link href="/sign-in" className="block">
          <Button variant="gold" size="lg" className="w-full">
            {dictionary.common.backToSignIn}
          </Button>
        </Link>
      ) : (
        <Button type="button" variant="gold" size="lg" className="w-full" disabled>
          {isPending ? dictionary.auth.magicLinkRedirecting : dictionary.auth.magicLinkChecking}
        </Button>
      )}
    </div>
  );
}
