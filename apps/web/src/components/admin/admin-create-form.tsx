"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TimezoneSelect } from "@/components/system/timezone-select";
import { Input } from "@/components/ui/input";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type ApiError = string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> };

function errorMessage(error: ApiError | undefined, fallback: string) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const firstFieldError = Object.values(error.fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
    return firstFieldError ?? error.formErrors?.[0] ?? fallback;
  }
  return fallback;
}

export function AdminCreateForm({ locale = "en" }: { locale?: AppLocale }) {
  const dictionary = getDictionary(locale);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/users/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
        timezone: String(formData.get("timezone") ?? ""),
        locale: String(formData.get("locale") ?? "browser"),
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: ApiError } | null;
      setError(errorMessage(data?.error, dictionary.admin.adminCreateError));
      setPending(false);
      return;
    }

    formRef.current?.reset();
    setSuccess(dictionary.admin.adminCreated);
    setPending(false);
    router.refresh();
  }

  return (
    <form ref={formRef} action={onSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.fullName}</span>
        <Input name="name" required />
      </label>
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.email}</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.temporaryPassword}</span>
        <Input name="temporaryPassword" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.confirmPassword}</span>
        <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.settings.schedulingTimezone}</span>
        <TimezoneSelect name="timezone" locale={locale} />
      </label>
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.settings.primaryLanguage}</span>
        <select name="locale" defaultValue="browser" className="h-[3.1rem] w-full rounded-[1.05rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm text-[var(--color-ink)]">
          <option value="browser">{dictionary.settings.browserDefaultLanguage}</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <div className="lg:col-span-2">
        <p className="mb-3 text-xs text-[var(--color-ink-soft)]">{dictionary.forms.temporaryPasswordHint}</p>
        <Button type="submit" variant="gold" disabled={pending}>{pending ? dictionary.common.saving : dictionary.admin.createAdmin}</Button>
      </div>
      {error ? <p className="text-xs text-rose-700 lg:col-span-2">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700 lg:col-span-2">{success}</p> : null}
    </form>
  );
}
