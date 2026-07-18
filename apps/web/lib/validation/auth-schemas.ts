import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string({ message: "El correo electrónico es obligatorio." })
    .trim()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Ingresa un correo electrónico válido."),
  password: z
    .string({ message: "La contraseña es obligatoria." })
    .min(1, "La contraseña es obligatoria."),
});

export const signUpSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio."),
  email: z
    .string({ message: "El correo electrónico es obligatorio." })
    .trim()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Ingresa un correo electrónico válido."),
  password: z
    .string({ message: "La contraseña es obligatoria." })
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: "El correo electrónico es obligatorio." })
    .trim()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Ingresa un correo electrónico válido."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string({ message: "La contraseña es obligatoria." })
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(128, "La contraseña no puede superar los 128 caracteres."),
    confirmPassword: z
      .string({ message: "Confirma tu contraseña." })
      .min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const canonicalResetPasswordSchema = z
  .object({
    newPassword: z
      .string({ message: "La contraseña es obligatoria." })
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(128, "La contraseña no puede superar los 128 caracteres."),
    confirmPassword: z
      .string({ message: "Confirma tu contraseña." })
      .min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
