import { z } from "zod";

export const profileOnboardingSchema = z.object({
	department: z.string().trim().min(1, "El departamento es obligatorio."),
	city: z.string().trim().min(1, "La ciudad es obligatoria."),
	phone: z.string().trim().optional(),
});

export const profileSettingsSchema = z.object({
	department: z.string().trim().min(1, "El departamento es obligatorio."),
	city: z.string().trim().min(1, "La ciudad es obligatoria."),
	phone: z
		.string()
		.trim()
		.refine(
			(value) => !value || value.replace(/\D/g, "").length >= 7,
			"Ingresa un teléfono válido (al menos 7 dígitos).",
		)
		.optional()
		.nullable(),
});

export type ProfileSettingsValues = z.infer<typeof profileSettingsSchema>;

const businessTypes = ["STORE", "RESTAURANT", "OTHER"] as const;

export const businessOnboardingSchema = z.object({
	name: z.string().trim().min(1, "El nombre del negocio es obligatorio."),
	businessType: z.enum(businessTypes, "Elige el tipo de negocio."),
	description: z.string().trim().max(280, "Máximo 280 caracteres.").optional(),
	logoUrl: z.url().optional().nullable(),
	logoObjectKey: z.string().trim().optional().nullable(),
});

export const businessSettingsSchema = z.object({
	name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
	businessType: z.enum(businessTypes),
	description: z
		.string()
		.trim()
		.max(280, "Máximo 280 caracteres.")
		.optional()
		.nullable(),
	logoUrl: z.url().optional().nullable(),
	logoObjectKey: z.string().trim().optional().nullable(),
	currencyCode: z
		.string()
		.trim()
		.length(3, "Usa un código de moneda de 3 letras."),
	timezone: z.string().trim().min(1, "La zona horaria es obligatoria."),
});

export type ProfileOnboardingValues = z.infer<typeof profileOnboardingSchema>;
export type BusinessOnboardingValues = z.infer<typeof businessOnboardingSchema>;
export type BusinessSettingsValues = z.infer<typeof businessSettingsSchema>;
