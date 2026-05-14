"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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

export function AdminPasswordResetForm({
  userId,
  disabled,
  locale = "en",
}: {
  userId: string;
  disabled?: boolean;
  locale?: AppLocale;
}) {
  const dictionary = getDictionary(locale);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPassword: String(formData.get("newPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: ApiError } | null;
      setError(errorMessage(data?.error, dictionary.admin.passwordResetError));
      setPending(false);
      return;
    }

    setSuccess(dictionary.admin.passwordResetSuccess);
    formRef.current?.reset();
    setPending(false);
  }

  if (disabled) {
    return <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.admin.selfPasswordResetBlocked}</p>;
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.newPassword}</span>
        <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <label className="space-y-1 text-left">
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.confirmPassword}</span>
        <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <Button type="submit" size="sm" variant="gold" disabled={pending}>
        {pending ? dictionary.common.saving : dictionary.admin.resetPassword}
      </Button>
      {error ? <p className="text-xs text-rose-700 md:col-span-3">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700 md:col-span-3">{success}</p> : null}
    </form>
  );
}
