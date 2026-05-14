import { z } from "zod";
import { normalizeInstrument } from "@/lib/instruments";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

const passwordStrengthMessage =
  "La contraseña temporal debe tener mínimo 8 caracteres e incluir letras y números.";

const timezoneSchema = z
  .string()
  .min(2)
  .max(80)
  .transform((value) => normalizeIanaTimezone(value));

const optionalTimezoneSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, timezoneSchema.optional());

function optionalTrimmedString(maxLength: number) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(maxLength).optional());
}

function isValidProfileImage(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const optionalUrlString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().url("URL inválida").max(500).optional());

const optionalProfileImageString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(500).refine((value) => isValidProfileImage(value), {
  message: "URL de foto inválida",
}).optional());

const requiredInstrumentSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return normalizeInstrument(value) ?? value.trim();
}, z.enum(["Piano", "Voice"], { message: "Selecciona Piano o Voz." }));

const optionalInstrumentSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return normalizeInstrument(trimmed) ?? trimmed;
}, z.enum(["Piano", "Voice"], { message: "Selecciona Piano o Voz." }).optional());

const requiredDollarAmountSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  return value;
}, z.coerce.number().int("Ingresa un monto en dólares sin centavos.").min(0, "El monto mensual no puede ser negativo."));

const optionalDollarAmountSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  return value;
}, z.coerce.number().int("Ingresa un monto en dólares sin centavos.").min(0, "El monto mensual no puede ser negativo.").optional());

const monthlyClassCountSchema = z.coerce.number().int().refine((value) => value === 4 || value === 8, {
  message: "Selecciona 4 u 8 clases mensuales.",
});

const optionalMonthlyClassCountSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  return value;
}, monthlyClassCountSchema.optional());

const teacherAvailabilityBlockSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinuteLocal: z.number().int().min(0).max(23 * 60 + 59),
    endMinuteLocal: z.number().int().min(1).max(24 * 60),
  })
  .refine((value) => value.endMinuteLocal > value.startMinuteLocal, {
    message: "Rango de horario inválido",
    path: ["endMinuteLocal"],
  });

export const createStudentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(180).transform((value) => value.toLowerCase().trim()),
  temporaryPassword: z
    .string()
    .min(8, passwordStrengthMessage)
    .max(72)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, passwordStrengthMessage),
  teacherId: z.string().min(1),
  monthlyClassCount: monthlyClassCountSchema,
  priceUsd: requiredDollarAmountSchema,
  timezone: optionalTimezoneSchema,
  phone: z.string().max(40).optional(),
  preferredInstrument: optionalInstrumentSchema,
  bio: z.string().max(500).optional(),
  profileImage: optionalProfileImageString,
});

export const createTeacherSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(180).transform((value) => value.toLowerCase().trim()),
  temporaryPassword: z
    .string()
    .min(8, passwordStrengthMessage)
    .max(72)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, passwordStrengthMessage),
  specialty: requiredInstrumentSchema,
  timezone: optionalTimezoneSchema,
  bio: optionalTrimmedString(500),
  zoomLink: optionalUrlString,
  meetLink: optionalUrlString,
  profileImage: optionalProfileImageString,
  availability: z.array(teacherAvailabilityBlockSchema).max(21).optional(),
});

export const updateStudentSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email().max(180).transform((value) => value.toLowerCase().trim()),
    timezone: optionalTimezoneSchema,
    teacherId: z.string().min(1).optional(),
    monthlyClassCount: optionalMonthlyClassCountSchema,
    priceUsd: optionalDollarAmountSchema,
    phone: optionalTrimmedString(40),
    preferredInstrument: optionalInstrumentSchema,
    bio: optionalTrimmedString(500),
    profileImage: optionalProfileImageString,
  })
  .superRefine((value, context) => {
    const hasClassCount = typeof value.monthlyClassCount === "number";
    const hasPrice = typeof value.priceUsd === "number";
    if (hasClassCount !== hasPrice) {
      context.addIssue({
        code: "custom",
        message: "El plan debe incluir cantidad de clases y monto mensual.",
        path: hasClassCount ? ["priceUsd"] : ["monthlyClassCount"],
      });
    }
  });

export const updateTeacherSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(180).transform((value) => value.toLowerCase().trim()),
  specialty: requiredInstrumentSchema,
  timezone: optionalTimezoneSchema,
  bio: optionalTrimmedString(500),
  zoomLink: optionalUrlString,
  meetLink: optionalUrlString,
  profileImage: optionalProfileImageString,
});

export const reassignTeacherSchema = z.object({
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
});

export const createAvailabilitySchema = z.object({
  teacherId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  startMinuteLocal: z.number().int().min(0).max(23 * 60 + 59),
  endMinuteLocal: z.number().int().min(1).max(24 * 60),
}).refine((value) => value.endMinuteLocal > value.startMinuteLocal, {
  message: "Rango de horario inválido",
  path: ["endMinuteLocal"],
});

export const updateAvailabilitySchema = createAvailabilitySchema.extend({
  availabilityId: z.string().min(1),
});

export const deleteAvailabilitySchema = z.object({
  availabilityId: z.string().min(1),
});
