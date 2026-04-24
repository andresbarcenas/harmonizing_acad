import Link from "next/link";
import { ArrowLeft, MessageCircleMore } from "lucide-react";

import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildWhatsAppPasswordSupportLink } from "@/lib/whatsapp";

export default function ForgotPasswordPage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden px-3 py-6 sm:px-4 md:px-6 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col items-center justify-center">
        <div className="rounded-[2rem] border border-white/70 bg-white/68 px-10 py-8 shadow-[var(--shadow-soft)] backdrop-blur-[16px]">
          <BrandLogo stacked className="justify-center" />
        </div>

        <Card className="mt-8 w-full rounded-[2rem] px-5 py-7 sm:px-7 sm:py-8 md:mt-10 md:px-8 md:py-9">
          <p className="page-eyebrow text-center">Acceso y soporte</p>
          <h1 className="mt-3 text-center font-display text-[2.25rem] tracking-[-0.04em] text-[var(--color-ink)] md:text-[2.7rem]">
            Recuperar contraseña
          </h1>
          <p className="mx-auto mt-4 max-w-md text-center text-base leading-7 text-[var(--color-ink-soft)]">
            Estamos atendiendo la recuperación de acceso de forma personalizada. Escríbenos por WhatsApp y te ayudamos a reactivar tu cuenta.
          </p>

          <div className="mt-8 space-y-4 rounded-[1.6rem] border border-[var(--color-border)] bg-white/74 p-5">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Qué incluye esta ayuda</p>
            <ul className="space-y-2 text-sm leading-6 text-[var(--color-ink-soft)]">
              <li>Verificación manual de tu identidad</li>
              <li>Actualización segura de tu acceso</li>
              <li>Respuesta del equipo en horario hábil</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={buildWhatsAppPasswordSupportLink()} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="gold" size="lg" className="w-full gap-2">
                <MessageCircleMore className="h-4 w-4" />
                Solicitar ayuda por WhatsApp
              </Button>
            </a>
            <Link href="/sign-in" className="flex-1">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver a iniciar sesión
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
