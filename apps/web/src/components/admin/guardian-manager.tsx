"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type GuardianSummary = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  students: Array<{
    linkId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    relationship: string;
    primaryContact: boolean;
  }>;
};

export function GuardianManager({
  students,
  guardians,
  locale,
}: {
  students: StudentOption[];
  guardians: GuardianSummary[];
  locale: AppLocale;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [pending, setPending] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function linkGuardian(formData: FormData) {
    setPending(true);
    setMessage(null);
    setError(null);

    const payload = {
      studentId: String(formData.get("studentId") ?? ""),
      name: String(formData.get("guardianName") ?? "").trim(),
      email: String(formData.get("guardianEmail") ?? "").trim(),
      relationship: String(formData.get("guardianRelationship") ?? "").trim(),
      phone: String(formData.get("guardianPhone") ?? "").trim() || undefined,
      primaryContact: formData.get("primaryContact") === "on",
    };

    const response = await fetch("/api/admin/guardians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as { error?: string | { fieldErrors?: Record<string, string[]>; formErrors?: string[] } } | null;
    if (!response.ok) {
      if (typeof data?.error === "string") {
        setError(data.error);
      } else if (data?.error && typeof data.error === "object") {
        const firstFieldError = Object.values(data.error.fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
        setError(firstFieldError ?? data.error.formErrors?.[0] ?? dictionary.admin.guardianLinkError);
      } else {
        setError(dictionary.admin.guardianLinkError);
      }
      setPending(false);
      return;
    }

    setMessage(dictionary.admin.guardianLinked);
    setPending(false);
    router.refresh();
  }

  async function unlinkGuardian(linkId: string) {
    setUnlinkingId(linkId);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/admin/guardians", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? dictionary.admin.guardianUnlinkError);
      setUnlinkingId(null);
      return;
    }
    setMessage(dictionary.admin.guardianUnlinked);
    setUnlinkingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form action={linkGuardian} className="rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4 shadow-[0_12px_30px_rgba(78,55,30,0.04)]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
            <span>{dictionary.common.student}</span>
            <select
              name="studentId"
              required
              defaultValue={students[0]?.id}
              className="h-[3.05rem] w-full rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.email}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
            <span>{dictionary.admin.guardianName}</span>
            <Input name="guardianName" placeholder={locale === "es" ? "María Rodríguez" : "Maria Rodriguez"} required />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
            <span>{dictionary.admin.guardianEmail}</span>
            <Input name="guardianEmail" type="email" placeholder="parent@email.com" required />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
            <span>{dictionary.admin.guardianRelationship}</span>
            <Input name="guardianRelationship" placeholder={locale === "es" ? "Madre, padre, tutor" : "Mother, father, guardian"} required />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
            <span>{dictionary.admin.guardianPhone}</span>
            <Input name="guardianPhone" placeholder="+1 555 123 4567" />
          </label>
          <label className="flex items-center gap-2 rounded-[1rem] border border-[var(--color-border)] bg-white/66 px-3 py-3 text-sm font-semibold text-[var(--color-ink-soft)]">
            <input name="primaryContact" type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--color-gold)]" />
            <span>{dictionary.admin.guardianPrimaryContact}</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="gold" disabled={pending || !students.length}>
            {pending ? dictionary.common.saving : dictionary.admin.linkGuardian}
          </Button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      </form>

      <div className="space-y-3">
        {guardians.map((guardian) => (
          <div key={guardian.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/70 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{guardian.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{guardian.email}</p>
                {guardian.phone ? <p className="text-xs text-[var(--color-ink-soft)]">{guardian.phone}</p> : null}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">
                {guardian.students.length} {dictionary.shell.nav.students.toLowerCase()}
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {guardian.students.map((link) => (
                <div key={link.linkId} className="flex flex-col gap-2 rounded-[1rem] border border-[var(--color-border)] bg-white/72 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      {link.studentName} · {link.relationship}
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-soft)]">
                      {link.studentEmail}
                      {link.primaryContact ? ` · ${dictionary.admin.guardianPrimaryContact}` : ""}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={unlinkingId === link.linkId} onClick={() => unlinkGuardian(link.linkId)}>
                    {unlinkingId === link.linkId ? dictionary.common.saving : dictionary.common.remove}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!guardians.length ? (
          <p className="rounded-[1.2rem] border border-dashed border-[var(--color-border)] bg-white/55 p-4 text-sm text-[var(--color-ink-soft)]">
            {dictionary.admin.noGuardians}
          </p>
        ) : null}
      </div>
    </div>
  );
}
