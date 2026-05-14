"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";

type StudentContextOption = {
  id: string;
  name: string;
  image?: string | null;
  instrument?: string | null;
};

export function TeacherStudentSelector({
  students,
  selectedStudentId,
  locale,
}: {
  students: StudentContextOption[];
  selectedStudentId?: string | null;
  locale: AppLocale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dictionary = getDictionary(locale);
  const selected = students.find((student) => student.id === selectedStudentId) ?? null;

  function updateStudentContext(studentId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (studentId) {
      params.set("studentId", studentId);
    } else {
      params.delete("studentId");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[1.35rem] border border-[var(--color-border)] bg-white/70 px-3 py-2 shadow-[0_10px_24px_rgba(78,55,30,0.04)] md:max-w-[24rem]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">
          {dictionary.teacher.studentContext}
        </p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
          {selected ? dictionary.teacher.selectedStudent : dictionary.teacher.allStudents}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          src={selected?.image}
          alt={selected?.name ?? dictionary.teacher.allStudents}
          fallback={(selected?.name ?? "A").slice(0, 1).toUpperCase()}
          className="h-8 w-8 shrink-0 text-[10px]"
        />
        <select
          aria-label={dictionary.teacher.switchStudent}
          value={selected?.id ?? ""}
          onChange={(event) => updateStudentContext(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-full border border-[var(--color-border)] bg-white/86 px-3 text-xs font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_14%,white)]"
        >
          <option value="">{dictionary.teacher.allStudents}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
              {student.instrument ? ` · ${instrumentLabel(student.instrument, locale)}` : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="truncate text-[11px] text-[var(--color-ink-soft)]">
        {students.length
          ? selected
            ? dictionary.teacher.selectedStudentDescription
            : dictionary.teacher.allStudentsDescription
          : dictionary.teacher.noStudentContext}
      </p>
    </div>
  );
}
