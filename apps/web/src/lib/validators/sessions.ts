import { z } from "zod";

function isValidIanaTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const timezoneSchema = z
  .string()
  .min(2)
  .max(80)
  .refine((value) => isValidIanaTimezone(value), { message: "Zona horaria inválida" });

export const createRecurringSessionsSchema = z.object({
  studentId: z.string().min(1),
  startsOnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: timezoneSchema,
  durationMin: z.number().int().min(30).max(180),
  occurrences: z.number().int().min(1).max(24),
  intervalWeeks: z.number().int().min(1).max(4),
  meetingUrl: z.string().url("URL de reunión inválida").max(500),
  lessonFocus: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(240).optional()),
});
