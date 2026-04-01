import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/rbac";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    redirect(defaultRouteForRole(session.user.role));
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-8">
      <BrandLogo />
      <section className="mt-16 rounded-3xl border border-[var(--color-border)] bg-[var(--color-paper)] p-8 shadow-[var(--shadow-soft)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">Online Music School</p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">Clases premium 1:1 para estudiantes hispanos en EE.UU.</h1>
        <p className="mt-4 max-w-xl text-[var(--color-ink-soft)]">
          Técnica vocal y piano con acompañamiento personalizado, seguimiento semanal por video y una experiencia digital diseñada para tu progreso.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-in">
            <Button variant="gold" size="lg">
              Iniciar sesión
            </Button>
          </Link>
          <a href="https://wa.me/573172666317?text=Hi%2C%20I%20want%20to%20manage%20my%20class%20plan%20in%20Harmonizing" target="_blank" rel="noreferrer">
            <Button variant="outline" size="lg">
              Manage my plan
            </Button>
          </a>
        </div>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold">Plan mensual</p>
          <p className="mt-2 text-2xl">$90 USD</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Incluye 4 clases personalizadas</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold">Modalidad</p>
          <p className="mt-2 text-2xl">1-on-1</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Tu docente asignado te acompaña todo el mes</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold">Seguimiento</p>
          <p className="mt-2 text-2xl">Semanal</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Prácticas en video y feedback directo</p>
        </Card>
      </div>
    </div>
  );
}
