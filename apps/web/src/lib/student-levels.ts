import type { AppLocale } from "@/lib/i18n/locales";

export const studentLevelOptions = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export type StudentLevelValue = (typeof studentLevelOptions)[number];

const studentLevelLabels: Record<AppLocale, Record<StudentLevelValue, string>> = {
  en: {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
  },
  es: {
    BEGINNER: "Principiante",
    INTERMEDIATE: "Intermedio",
    ADVANCED: "Avanzado",
  },
};

export function studentLevelLabel(level: string | null | undefined, locale: AppLocale) {
  if (!level || !studentLevelOptions.includes(level as StudentLevelValue)) return studentLevelLabels[locale].BEGINNER;
  return studentLevelLabels[locale][level as StudentLevelValue];
}
