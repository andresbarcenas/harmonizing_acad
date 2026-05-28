import { NativeInvoicePaymentMethod, NativeInvoiceStatus } from "@prisma/client";
import { z } from "zod";

export const nativeInvoiceSessionCountSchema = z.preprocess((value) => {
  if (typeof value === "string") return Number(value);
  return value;
}, z.union([z.literal(2), z.literal(4), z.literal(8)]));

export const nativeInvoicePriceSchema = z.preprocess((value) => {
  if (typeof value === "string") return Number(value.replace(/[^0-9]/g, ""));
  return value;
}, z.number().int().min(0).max(50_000_000));

const optionalTrimmed = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(2000).optional());

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createNativeInvoiceSchema = z.object({
  studentId: z.string().min(1),
  periodStart: dateString,
  periodEnd: dateString.optional(),
  issueDate: dateString.optional(),
  dueDate: dateString.optional(),
  sessionCount: nativeInvoiceSessionCountSchema,
  pricePerClassCop: nativeInvoicePriceSchema,
  savePriceToStudent: z.boolean().optional().default(false),
  notes: optionalTrimmed,
});

export const updateNativeInvoiceSchema = z.object({
  periodStart: dateString.optional(),
  periodEnd: dateString.optional(),
  issueDate: dateString.optional(),
  dueDate: dateString.optional(),
  sessionCount: nativeInvoiceSessionCountSchema.optional(),
  pricePerClassCop: nativeInvoicePriceSchema.optional(),
  savePriceToStudent: z.boolean().optional().default(false),
  notes: optionalTrimmed,
});

export const nativeInvoiceStatusSchema = z.object({
  status: z.nativeEnum(NativeInvoiceStatus),
});

export const nativeInvoiceBulkGenerateSchema = z.object({
  periodStart: dateString,
});

export const studentBillingProfileSchema = z.object({
  defaultSessionCount: nativeInvoiceSessionCountSchema.optional(),
  pricePerClassCop: nativeInvoicePriceSchema.optional(),
  notes: optionalTrimmed,
  autoGenerateEnabled: z.boolean().optional(),
});

export const createNativeInvoicePaymentSchema = z.object({
  amountCop: nativeInvoicePriceSchema.pipe(z.number().int().min(1).max(500_000_000)),
  method: z.nativeEnum(NativeInvoicePaymentMethod),
  paymentDate: dateString,
  reference: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(160).optional()),
  notes: optionalTrimmed,
});

export const voidNativeInvoicePaymentSchema = z.object({
  reason: optionalTrimmed,
});

export const classCreditAdjustmentSchema = z.object({
  delta: z.preprocess((value) => {
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().min(-100).max(100).refine((value) => value !== 0, "Delta cannot be zero.")),
  reason: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(160).optional()),
  note: optionalTrimmed,
});
