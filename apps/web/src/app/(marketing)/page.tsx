import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, MessageCircleMore, Sparkles } from "lucide-react";

import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { APP_VERSION } from "@/lib/release";
import { defaultRouteForRole } from "@/lib/rbac";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    redirect(defaultRouteForRole(session.user.role));
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-3 py-6 sm:px-4 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <Link href="/sign-in">
          <Button variant="outline" className="gap-2">
            Iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <section className="page-hero mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="page-eyebrow">Experiencia premium</p>
          <h1 className="page-title">Tu escuela de música exclusiva para avanzar con calma, técnica y acompañamiento real.</h1>
          <p className="page-copy">
            Clases 1:1 de piano y técnica vocal para estudiantes hispanos en Estados Unidos, con seguimiento semanal, reagendación simple y una experiencia digital elegante.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-in">
              <Button variant="gold" size="lg" className="gap-2">
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://wa.me/573172666317?text=Hi%2C%20I%20want%20to%20manage%20my%20class%20plan%20in%20Harmonizing" target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="gap-2">
                <MessageCircleMore className="h-4 w-4" />
                Gestionar mi plan
              </Button>
            </a>
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[var(--color-gold)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[var(--color-gold-deep)]">Membresía</p>
          <p className="mt-4 font-display text-5xl leading-none tracking-[-0.05em]">$90</p>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">4 clases personalizadas al mes, docente asignado y soporte continuo.</p>
          <div className="soft-divider my-6" />
          <div className="space-y-3 text-sm text-[var(--color-ink-soft)]">
            <p>Clases privadas con horario estable</p>
            <p>Feedback semanal sobre tus prácticas en video</p>
            <p>Reagendación simple con aprobación docente</p>
          </div>
        </Card>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">Plan mensual</p>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">$90 USD</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Incluye 4 clases personalizadas</p>
        </Card>
        <Card>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">Modalidad</p>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">1-on-1</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Tu docente asignado te acompaña todo el mes</p>
        </Card>
        <Card>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-deep)]">Seguimiento</p>
          <p className="mt-3 font-display text-4xl tracking-[-0.05em]">Semanal</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Prácticas en video y feedback directo</p>
        </Card>
      </div>

      <footer className="mt-10 pb-2 text-center text-xs tracking-[0.12em] text-[var(--color-ink-soft)] uppercase">
        Harmonizing {APP_VERSION}
      </footer>
    </div>
  );
}
