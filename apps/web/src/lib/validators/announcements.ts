import { AppAnnouncementStatus, AppAnnouncementType, Role } from "@prisma/client";
import { z } from "zod";

function optionalTrimmedString(maxLength: number) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(maxLength).optional());
}

const requiredTrimmedString = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const optionalDateString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().datetime({ offset: true }).optional());

const ctaUrlSchema = optionalTrimmedString(500).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}, { message: "CTA URL must be an internal path or http(s) URL." });

export const appAnnouncementSchema = z
  .object({
    type: z.nativeEnum(AppAnnouncementType),
    status: z.nativeEnum(AppAnnouncementStatus),
    targetRoles: z.array(z.nativeEnum(Role)).min(1).refine((roles) => new Set(roles).size === roles.length, {
      message: "Target roles must be unique.",
    }),
    titleEn: requiredTrimmedString(140),
    bodyEn: requiredTrimmedString(1000),
    titleEs: requiredTrimmedString(140),
    bodyEs: requiredTrimmedString(1000),
    ctaLabelEn: optionalTrimmedString(80),
    ctaLabelEs: optionalTrimmedString(80),
    ctaUrl: ctaUrlSchema,
    startsAt: optionalDateString,
    endsAt: optionalDateString,
  })
  .superRefine((value, context) => {
    const hasAnyCtaLabel = Boolean(value.ctaLabelEn || value.ctaLabelEs);
    if (hasAnyCtaLabel && !value.ctaUrl) {
      context.addIssue({ code: "custom", message: "CTA URL is required when CTA label is set.", path: ["ctaUrl"] });
    }
    if (value.ctaUrl && !hasAnyCtaLabel) {
      context.addIssue({ code: "custom", message: "At least one CTA label is required when CTA URL is set.", path: ["ctaLabelEn"] });
    }
    if (value.startsAt && value.endsAt && new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
      context.addIssue({ code: "custom", message: "End date must be after start date.", path: ["endsAt"] });
    }
  });

export type AppAnnouncementInput = z.infer<typeof appAnnouncementSchema>;
