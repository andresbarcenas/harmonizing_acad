import { z } from "zod";
import { RecurringTimezoneMode } from "@prisma/client";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

const timezoneSchema = z
  .string()
  .min(2)
  .max(80)
  .transform((value) => normalizeIanaTimezone(value));

export const createRecurringSessionsSchema = z.object({
  studentId: z.string().min(1),
  teacherId: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().min(1).optional()),
  startsOnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  timezoneMode: z
    .enum([
      RecurringTimezoneMode.STUDENT_TIME,
      RecurringTimezoneMode.TEACHER_TIME,
      RecurringTimezoneMode.CUSTOM_TIMEZONE,
    ])
    .optional()
    .default(RecurringTimezoneMode.STUDENT_TIME),
  timezone: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, timezoneSchema.optional()),
  durationMin: z.number().int().min(30).max(180),
  horizonWeeks: z.number().int().min(1).max(26),
  intervalWeeks: z.number().int().min(1).max(4),
  meetingUrl: z.string().url("URL de reunión inválida").max(500),
  lessonFocus: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(240).optional()),
});
