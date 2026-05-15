import { ClassRequestStatus, ClassSessionType } from "@prisma/client";
import { z } from "zod";

import { normalizeInstrument } from "@/lib/instruments";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

const timezoneSchema = z
  .string()
  .min(2)
  .max(80)
  .transform((value) => normalizeIanaTimezone(value));

const optionalString = (max = 500) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(max).optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().url("URL inválida").max(500).optional());

const optionalInstrument = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return normalizeInstrument(trimmed) ?? trimmed;
}, z.enum(["Piano", "Voice"], { message: "Selecciona Piano o Voz." }).optional());

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida");
const durationSchema = z.coerce.number().int().min(15).max(180);
const classTimezoneModeSchema = z
  .enum(["STUDENT_TIME", "TEACHER_TIME", "CUSTOM_TIMEZONE"])
  .default("STUDENT_TIME");

export const singleClassBookingTypes = [
  ClassSessionType.SINGLE,
  ClassSessionType.TRIAL,
  ClassSessionType.MAKEUP,
  ClassSessionType.EXTRA,
  ClassSessionType.EVALUATION,
  ClassSessionType.REPLACEMENT,
] as const;

export const studentClassRequestTypes = [
  ClassSessionType.MAKEUP,
  ClassSessionType.EXTRA,
  ClassSessionType.EVALUATION,
] as const;

export const singleClassBookingSchema = z.object({
  studentId: z.string().min(1),
  teacherId: optionalString(100),
  type: z.enum(singleClassBookingTypes),
  instrument: optionalInstrument,
  date: dateSchema,
  startTimeLocal: timeSchema,
  durationMin: durationSchema,
  timezoneMode: classTimezoneModeSchema,
  timezone: timezoneSchema,
  locationMode: z.preprocess((value) => {
    if (typeof value !== "string") return "ONLINE";
    const normalized = value.trim().toUpperCase();
    return normalized.length ? normalized : "ONLINE";
  }, z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).default("ONLINE")),
  meetingUrl: optionalUrl,
  lessonFocus: optionalString(240),
  internalNote: optionalString(1000),
  studentVisibleNote: optionalString(1000),
});

export const createClassRequestSchema = z.object({
  teacherId: optionalString(100),
  type: z.enum(studentClassRequestTypes),
  date: dateSchema,
  startTimeLocal: timeSchema,
  durationMin: durationSchema,
  timezone: timezoneSchema,
  studentMessage: optionalString(1000),
});

export const reviewClassRequestSchema = z.object({
  status: z.enum([ClassRequestStatus.ACCEPTED, ClassRequestStatus.REJECTED]),
  reviewerResponse: optionalString(1000),
  rejectionReason: optionalString(1000),
  internalNote: optionalString(1000),
});

export type SingleClassBookingInput = z.infer<typeof singleClassBookingSchema>;
export type CreateClassRequestInput = z.infer<typeof createClassRequestSchema>;
export type ReviewClassRequestInput = z.infer<typeof reviewClassRequestSchema>;
