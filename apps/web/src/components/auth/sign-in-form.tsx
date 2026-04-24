"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Ingresa tu correo y contraseña para continuar.");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error || !result?.ok) {
      // Security-sensitive: keep message generic to avoid leaking whether an email exists.
      setError("No pudimos iniciar sesión. Verifica tus credenciales.");
      setSubmitting(false);
      return;
    }

    startTransition(() => {
      router.push("/");
      router.refresh();
    });
    setSubmitting(false);
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-base font-semibold text-[var(--color-ink-soft)]">Correo Electrónico</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input
            type="email"
            name="email"
            defaultValue="isabella@harmonizing.com"
            placeholder="tu@email.com"
            required
            className="pl-12"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-base font-semibold text-[var(--color-ink-soft)]">Contraseña</label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input type="password" name="password" placeholder="••••••••" required className="pl-12" />
        </div>
      </div>
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" variant="gold" size="lg" className="w-full gap-2" disabled={isPending || submitting}>
        {isPending || submitting ? "Ingresando..." : "Iniciar Sesión"}
        {!isPending && !submitting ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
      <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/72 px-4 py-3 text-xs leading-5 text-[var(--color-ink-soft)]">
        Acceso demo: <span className="font-semibold text-[var(--color-ink)]">isabella@harmonizing.com</span> /{" "}
        <span className="font-semibold text-[var(--color-ink)]">demo123</span>
      </div>
      <Link
        href="/forgot-password"
        className="block pt-1 text-center text-sm font-semibold text-[var(--color-gold-deep)] transition hover:text-[var(--color-gold)]"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
