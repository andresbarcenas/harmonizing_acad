import { BrandLogo } from "@/components/brand/logo";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full">
        <BrandLogo className="mb-6" />
        <h1 className="font-display text-3xl">Bienvenido de nuevo</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Ingresa con tus credenciales para ver tu espacio.</p>
        <div className="mt-6">
          <SignInForm />
        </div>
        <div className="mt-5 rounded-xl bg-[var(--color-muted)] p-3 text-xs text-[var(--color-ink-soft)]">
          Demo: `student@harmonizing.app` / `Harmonizing123!`
        </div>
      </Card>
    </div>
  );
}
