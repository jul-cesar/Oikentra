import { z } from "zod"

export const profileOnboardingSchema = z.object({
  department: z.string().trim().min(1, "El departamento es obligatorio."),
  city: z.string().trim().min(1, "La ciudad es obligatoria."),
  phone: z.string().trim().optional(),
})

export const businessOnboardingSchema = z.object({
  name: z.string().trim().min(1, "El nombre del negocio es obligatorio."),
})

export type ProfileOnboardingValues = z.infer<typeof profileOnboardingSchema>
export type BusinessOnboardingValues = z.infer<typeof businessOnboardingSchema>
