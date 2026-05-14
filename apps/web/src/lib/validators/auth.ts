import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().email("Email inválido").max(180).transform((value) => value.toLowerCase()),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;
