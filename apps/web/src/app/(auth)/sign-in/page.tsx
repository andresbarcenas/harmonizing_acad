import { Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/logo";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/rbac";
import { APP_VERSION } from "@/lib/release";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) {
    redirect(defaultRouteForRole(session.user.role));
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-3 py-6 sm:px-4 md:px-6 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col items-center justify-center">
        <div className="relative text-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/68 px-10 py-8 shadow-[var(--shadow-soft)] backdrop-blur-[16px]">
            <BrandLogo stacked className="justify-center" />
          </div>
          <div className="absolute -right-5 top-24 flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/86 text-[var(--color-gold)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mx-auto mt-8 max-w-sm text-[1.4rem] font-medium tracking-[-0.04em] text-[var(--color-ink-soft)] sm:text-[1.6rem] md:mt-10 md:text-[1.8rem]">
            Tu escuela de música exclusiva
          </p>
        </div>

        <Card className="mt-8 w-full rounded-[2rem] px-5 py-7 sm:px-7 sm:py-8 md:mt-10 md:px-8 md:py-9">
          <h1 className="text-center font-display text-[2rem] tracking-[-0.04em] text-[var(--color-ink)] sm:text-[2.4rem] md:text-[2.9rem]">
            Iniciar Sesión
          </h1>
          <div className="mt-10">
            <SignInForm />
          </div>
        </Card>
        <p className="mt-5 text-center text-xs tracking-[0.12em] text-[var(--color-ink-soft)] uppercase">
          Harmonizing {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
