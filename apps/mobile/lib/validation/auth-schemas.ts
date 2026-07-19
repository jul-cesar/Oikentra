import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const signUpSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
