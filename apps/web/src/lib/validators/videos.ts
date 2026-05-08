import { z } from "zod";

export const reviewVideoSchema = z.object({
  videoId: z.string().min(1, "Video inválido."),
  comment: z
    .string()
    .min(3, "El feedback debe tener al menos 3 caracteres.")
    .max(2000, "El feedback no puede superar 2000 caracteres."),
  skillRatings: z
    .array(
      z.object({
        skillCategoryId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        note: z.string().max(500).optional(),
      }),
    )
    .max(12)
    .optional(),
});

export type ReviewVideoInput = z.infer<typeof reviewVideoSchema>;
