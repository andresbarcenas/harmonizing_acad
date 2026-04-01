import { z } from "zod";

export const reviewVideoSchema = z.object({
  videoId: z.string().min(1),
  comment: z.string().min(3).max(2000),
});

export type ReviewVideoInput = z.infer<typeof reviewVideoSchema>;
