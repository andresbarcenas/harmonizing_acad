import type { ZodError } from "zod";

import type { AppLocale } from "@/lib/i18n/locales";

const validationTranslations: Record<string, { en: string; es: string }> = {
  "Invalid payload": {
    en: "Invalid payload.",
    es: "Datos inválidos.",
  },
  "Invalid payload.": {
    en: "Invalid payload.",
    es: "Datos inválidos.",
  },
  "Invalid announcement.": {
    en: "Invalid announcement.",
    es: "Anuncio inválido.",
  },
  "CTA URL must be an internal path or http(s) URL.": {
    en: "CTA URL must be an internal path or http(s) URL.",
    es: "La URL del CTA debe ser una ruta interna o una URL http(s).",
  },
  "Target roles must be unique.": {
    en: "Target roles must be unique.",
    es: "Los roles destino no pueden repetirse.",
  },
  "CTA URL is required when CTA label is set.": {
    en: "CTA URL is required when CTA label is set.",
    es: "La URL del CTA es obligatoria cuando agregas una etiqueta de CTA.",
  },
  "At least one CTA label is required when CTA URL is set.": {
    en: "At least one CTA label is required when CTA URL is set.",
    es: "Agrega al menos una etiqueta de CTA cuando indiques una URL de CTA.",
  },
  "End date must be after start date.": {
    en: "End date must be after start date.",
    es: "La fecha final debe ser posterior a la fecha de inicio.",
  },
  "Lesson summary is required when completing a class.": {
    en: "Lesson summary is required when completing a class.",
    es: "El resumen de la clase es obligatorio al completar una clase.",
  },
  "Selecciona Piano o Voz.": {
    en: "Select Piano or Voice.",
    es: "Selecciona Piano o Voz.",
  },
  "URL de foto inválida": {
    en: "Invalid photo URL.",
    es: "URL de foto inválida.",
  },
  "URL inválida": {
    en: "Invalid URL.",
    es: "URL inválida.",
  },
  "Fecha inválida": {
    en: "Invalid date.",
    es: "Fecha inválida.",
  },
  "Hora inválida": {
    en: "Invalid time.",
    es: "Hora inválida.",
  },
  "Ingresa un email válido.": {
    en: "Enter a valid email.",
    es: "Ingresa un email válido.",
  },
  "Debes confirmar que leíste y aceptas el consentimiento.": {
    en: "Confirm that you read and accept the consent.",
    es: "Debes confirmar que leíste y aceptas el consentimiento.",
  },
};

export function localizeValidationMessage(message: string | undefined, locale: AppLocale, fallback?: string) {
  const defaultFallback = locale === "es" ? "Datos inválidos." : "Invalid payload.";
  if (!message) return fallback ?? defaultFallback;
  return validationTranslations[message]?.[locale] ?? message;
}

export function validationErrorMessage(error: ZodError, locale: AppLocale, fallback?: string) {
  return localizeValidationMessage(error.issues[0]?.message, locale, fallback);
}
