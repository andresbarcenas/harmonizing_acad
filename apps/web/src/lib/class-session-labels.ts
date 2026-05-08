import { ClassRequestStatus, ClassSessionType, SessionStatus } from "@prisma/client";
import type { AppLocale } from "@/lib/i18n/locales";

export function classTypeLabel(type: ClassSessionType | string, locale: AppLocale) {
  const labels: Record<string, { en: string; es: string }> = {
    RECURRING: { en: "Recurring", es: "Recurrente" },
    SINGLE: { en: "Single private lesson", es: "Clase individual" },
    TRIAL: { en: "Trial class", es: "Clase de prueba" },
    MAKEUP: { en: "Makeup class", es: "Clase de reposición" },
    EXTRA: { en: "Extra practice", es: "Práctica extra" },
    EVALUATION: { en: "Evaluation", es: "Evaluación" },
    REPLACEMENT: { en: "Replacement", es: "Reemplazo" },
  };
  return labels[type]?.[locale] ?? String(type);
}

export function classStatusLabel(status: SessionStatus | string, locale: AppLocale) {
  const labels: Record<string, { en: string; es: string }> = {
    SCHEDULED: { en: "Scheduled", es: "Programada" },
    COMPLETED: { en: "Completed", es: "Completada" },
    NO_SHOW: { en: "No-show", es: "Ausencia" },
    RESCHEDULE_PENDING: { en: "Reschedule pending", es: "Reagenda pendiente" },
    CANCELLED: { en: "Cancelled", es: "Cancelada" },
  };
  return labels[status]?.[locale] ?? String(status);
}

export function classRequestStatusLabel(status: ClassRequestStatus | string, locale: AppLocale) {
  const labels: Record<string, { en: string; es: string }> = {
    PENDING: { en: "Pending", es: "Pendiente" },
    ACCEPTED: { en: "Accepted", es: "Aceptada" },
    REJECTED: { en: "Rejected", es: "Rechazada" },
    CANCELLED: { en: "Cancelled", es: "Cancelada" },
  };
  return labels[status]?.[locale] ?? String(status);
}
