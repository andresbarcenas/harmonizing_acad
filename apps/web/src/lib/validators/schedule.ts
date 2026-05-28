import { z } from "zod";

export const rescheduleSchema = z.object({
  studentId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  proposedStartUtc: z.string().datetime(),
  proposedEndUtc: z.string().datetime(),
  studentMessage: z.string().max(280).optional(),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;
