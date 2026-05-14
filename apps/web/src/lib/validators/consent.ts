import { z } from "zod";

export const signConsentSchema = z.object({
  signerName: z.string().trim().min(2, "Ingresa el nombre completo de la madre, padre o tutor.").max(140),
  signerRelationship: z.string().trim().min(2, "Indica la relación con el estudiante.").max(80),
  signerEmail: z.string().trim().email("Ingresa un email válido.").max(180).transform((value) => value.toLowerCase()),
  acknowledged: z.literal(true, {
    error: "Debes confirmar que leíste y aceptas el consentimiento.",
  }),
});
