import { z } from "zod";

const passwordStrengthMessage =
  "La contraseña debe tener mínimo 8 caracteres e incluir letras y números.";

export const securePasswordSchema = z
  .string()
  .min(8, passwordStrengthMessage)
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, passwordStrengthMessage);

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: securePasswordSchema,
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Las contraseñas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  });

export const adminPasswordResetSchema = z
  .object({
    newPassword: securePasswordSchema,
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Las contraseñas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  });
