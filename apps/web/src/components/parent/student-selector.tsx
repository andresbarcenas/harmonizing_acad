"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import type { AppLocale } from "@/lib/i18n/locales";
import { instrumentLabel } from "@/lib/instruments";

type ParentStudentOption = {
  id: string;
  name: string;
  image?: string | null;
  instrument?: string | null;
  relationship?: string | null;
};

export function ParentStudentSelector({
  students,
  selectedStudentId,
  locale,
}: {
  students: ParentStudentOption[];
  selectedStudentId?: string | null;
  locale: AppLocale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSpanish = locale === "es";
  const selected = students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;

  function updateStudentContext(studentId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (studentId) params.set("studentId", studentId);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[1.35rem] border border-[var(--color-border)] bg-white/70 px-3 py-2 shadow-[0_10px_24px_rgba(78,55,30,0.04)] md:max-w-[24rem]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">
          {isSpanish ? "Portal familiar" : "Family portal"}
        </p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
          {isSpanish ? "Estudiante" : "Student"}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          src={selected?.image}
          alt={selected?.name ?? (isSpanish ? "Estudiante" : "Student")}
          fallback={(selected?.name ?? "E").slice(0, 1).toUpperCase()}
          className="h-8 w-8 shrink-0 text-[10px]"
          locale={locale}
        />
        <select
          aria-label={isSpanish ? "Cambiar estudiante" : "Switch student"}
          value={selected?.id ?? ""}
          onChange={(event) => updateStudentContext(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-full border border-[var(--color-border)] bg-white/86 px-3 text-xs font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_14%,white)]"
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
              {student.instrument ? ` · ${instrumentLabel(student.instrument, locale)}` : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="truncate text-[11px] text-[var(--color-ink-soft)]">
        {selected?.relationship
          ? `${isSpanish ? "Relación" : "Relationship"}: ${selected.relationship}`
          : isSpanish
            ? "Acciones y vistas usan el estudiante seleccionado."
            : "Actions and views use the selected student."}
      </p>
    </div>
  );
}
