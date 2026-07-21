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

export const createCreditFormSchema = z.object({
  customerName: z.string().trim().min(1, "Escribe o selecciona un cliente."),
  amount: integerAmount("El monto"),
  creditDate: businessDate,
  note: z.string().trim().max(500, "La nota no puede superar 500 caracteres."),
});

export const createPaymentFormSchema = z.object({
  amount: integerAmount("El abono"),
  paymentDate: businessDate,
  note: z.string().trim().max(500, "La nota no puede superar 500 caracteres."),
});

export const cancelFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo de la anulación.")
    .max(500, "El motivo no puede superar 500 caracteres."),
});

export type CreateCreditFormValues = z.infer<typeof createCreditFormSchema>;
export type CreatePaymentFormValues = z.infer<typeof createPaymentFormSchema>;
export type CancelFormValues = z.infer<typeof cancelFormSchema>;
