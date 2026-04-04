import { z } from "zod";

export const viewerTimezoneSchema = z.object({
  timezone: z.string().min(2).max(80),
});

function isValidProfileImage(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const viewerProfileSchema = z.object({
  image: z
    .preprocess((value) => {
      if (value === null || value === undefined) return null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }, z.union([z.string().max(500), z.null()]))
    .refine((value) => value === null || isValidProfileImage(value), {
      message: "URL de foto inválida",
    }),
});
