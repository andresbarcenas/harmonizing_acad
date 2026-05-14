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

export function PasswordChangeForm({
  allowPasswordSetupWithoutCurrent = false,
  locale = "en",
}: {
  allowPasswordSetupWithoutCurrent?: boolean;
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

    const payload: Record<string, string> = {
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    if (!allowPasswordSetupWithoutCurrent) {
      payload.currentPassword = String(formData.get("currentPassword") ?? "");
    }

    const response = await fetch("/api/viewer/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: ApiError } | null;
      setError(errorMessage(data?.error, dictionary.settings.passwordChangeError));
      setPending(false);
      return;
    }

    setSuccess(dictionary.settings.passwordChanged);
    formRef.current?.reset();
    setPending(false);
  }

  return (
    <form ref={formRef} action={onSubmit} className="mt-4 space-y-3">
      <div className={`grid gap-3 ${allowPasswordSetupWithoutCurrent ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {!allowPasswordSetupWithoutCurrent ? (
          <label className="space-y-1.5 text-left">
            <span className="text-sm font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.currentPassword}</span>
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </label>
        ) : null}
        <label className="space-y-1.5 text-left">
          <span className="text-sm font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.newPassword}</span>
          <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
        </label>
        <label className="space-y-1.5 text-left">
          <span className="text-sm font-semibold text-[var(--color-ink-soft)]">{dictionary.forms.confirmPassword}</span>
          <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
        </label>
      </div>
      <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.forms.passwordHint}</p>
      <Button type="submit" variant="gold" disabled={pending}>
        {pending
          ? dictionary.common.saving
          : allowPasswordSetupWithoutCurrent
            ? dictionary.settings.setPassword
            : dictionary.settings.changePassword}
      </Button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
    </form>
  );
}
