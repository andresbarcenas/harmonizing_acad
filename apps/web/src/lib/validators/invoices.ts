import { z } from "zod";

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

export const adminInvoiceSyncSchema = z.object({
  studentId: optionalString,
});

export const invoiceContactLinkSchema = z.object({
  studentId: z.string().min(1),
  alegraContactId: z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }, z.union([z.string().max(120), z.null()])),
});
