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
  customerId: z.string().trim().min(1, "Selecciona un cliente."),
  newCustomerName: z.string().trim().max(120, "El nombre no puede superar 120 caracteres."),
  newCustomerPhone: z.string().trim().max(30, "El teléfono no puede superar 30 caracteres."),
  newCustomerNotes: z.string().trim().max(500, "Las notas no pueden superar 500 caracteres."),
  amount: integerAmount("El monto"),
  creditDate: businessDate,
  note: z.string().trim().max(500, "La nota no puede superar 500 caracteres."),
}).superRefine((value, ctx) => {
  if (value.customerId === "__new__" && !value.newCustomerName) {
    ctx.addIssue({ code: "custom", path: ["newCustomerName"], message: "Escribe el nombre del cliente." });
  }
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
