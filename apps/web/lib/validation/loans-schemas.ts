import { z } from "zod";

const integerAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio.`)
    .regex(/^\d+$/, `${label} debe ser un número entero.`)
    .refine((value) => Number(value) > 0, `${label} debe ser mayor que cero.`);

const interestRate = z
  .string()
  .trim()
  .regex(/^\d{0,3}([.,]\d{1,2})?$/, "El interés debe ser un porcentaje.")
  .transform((value) => {
    const normalized = value.replace(",", ".");
    return normalized === "" ? "0" : normalized;
  })
  .refine((value) => Number(value) >= 0, "El interés no puede ser negativo.")
  .refine((value) => Number(value) <= 100, "El interés no puede superar 100%.");

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.");

export const createLoanFormSchema = z
  .object({
    customerId: z.string().trim().min(1, "Selecciona un cliente."),
    newCustomerName: z.string().trim().max(120, "El nombre no puede superar 120 caracteres."),
    newCustomerPhone: z.string().trim().max(30, "El teléfono no puede superar 30 caracteres."),
    newCustomerNotes: z.string().trim().max(500, "Las notas no pueden superar 500 caracteres."),
    capitalAmount: integerAmount("El capital"),
    interestRate: interestRate,
	frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
    termCount: z
      .string()
      .trim()
      .regex(/^\d*$/, "El número de cuotas debe ser un número entero.")
      .transform((value) => (value === "" ? "1" : value))
      .refine((value) => Number(value) >= 1, "Debe ser al menos 1 cuota.")
      .refine((value) => Number(value) <= 360, "No puede superar 360 cuotas."),
    startDate: businessDate,
    note: z.string().trim().max(500, "La nota no puede superar 500 caracteres."),
  })
  .superRefine((value, ctx) => {
    if (value.customerId === "__new__" && !value.newCustomerName) {
      ctx.addIssue({ code: "custom", path: ["newCustomerName"], message: "Escribe el nombre del cliente." });
    }
  });

export const createLoanPaymentFormSchema = z.object({
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

export type CreateLoanFormValues = z.infer<typeof createLoanFormSchema>;
export type CreateLoanPaymentFormValues = z.infer<typeof createLoanPaymentFormSchema>;
export type CancelFormValues = z.infer<typeof cancelFormSchema>;
