import { z } from "zod";

const integerAmount = (label: string) =>
	z
		.string()
		.trim()
		.min(1, `${label} es obligatorio.`)
		.regex(/^\d+$/, `${label} debe ser un número entero.`)
		.refine((value) => Number(value) > 0, `${label} debe ser mayor que cero.`);

const businessDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.");

export const createSaleFormSchema = z.object({
	amount: integerAmount("El monto"),
	category: z
		.string()
		.trim()
		.max(80, "La categoría no puede superar 80 caracteres."),
	note: z.string().trim().max(500, "La nota no puede superar 500 caracteres."),
	businessDate,
});

export const cancelMovementFormSchema = z.object({
	reason: z
		.string()
		.trim()
		.min(1, "Escribe el motivo de la anulación.")
		.max(500, "El motivo no puede superar 500 caracteres."),
});

export type CreateSaleFormValues = z.infer<typeof createSaleFormSchema>;
export type CancelMovementFormValues = z.infer<typeof cancelMovementFormSchema>;
