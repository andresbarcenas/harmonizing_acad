import { z } from "zod";

export const createMessageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
