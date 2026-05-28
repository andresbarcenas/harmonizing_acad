import { z } from "zod";

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const startParam = z.preprocess((value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}, z.number().int().min(0).default(0));

const limitParam = z.preprocess((value) => {
  const parsed = Number(value ?? 30);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(Math.floor(parsed), 30);
}, z.number().int().min(1).max(30).default(30));

const dateString = optionalString.refine((value) => {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}, "Use YYYY-MM-DD.");

export const alegraContactsQuerySchema = z.object({
  query: optionalString,
  identification: optionalString,
  name: optionalString,
  start: startParam,
  limit: limitParam,
});

export const alegraInvoicesQuerySchema = z.object({
  contactId: optionalString,
  clientName: optionalString,
  invoiceNumber: optionalString,
  status: optionalString,
  startDate: dateString,
  endDate: dateString,
  start: startParam,
  limit: limitParam,
});

export const alegraPaymentsQuerySchema = z.object({
  contactId: optionalString,
  paymentId: optionalString,
  type: optionalString.default("in"),
  start: startParam,
  limit: limitParam,
});

export function queryParamsFromUrl(url: string) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
