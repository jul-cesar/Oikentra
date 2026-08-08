import { z } from "zod";

const integerAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio.`)
    .regex(/^\d+$/, `${label} debe ser un número entero.`)
    .refine((value) => Number(value) > 0, `${label} debe ser mayor que cero.`);

const integerOrZero = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, `${label} debe ser un número entero.`)
    .transform((value) => (value === "" ? "0" : value))
    .refine((value) => Number(value) >= 0, `${label} no puede ser negativo.`);

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
    interestAmount: integerOrZero("El interés"),
    termCount: z
      .string()
      .trim()
      .regex(/^\d*$/, "El número de cuotas debe ser un número entero.")
      .transform((value) => (value === "" ? "1" : value))
      .refine((value) => Number(value) >= 1, "Debe ser al menos 1 cuota.")
      .refine((value) => Number(value) <= 24, "No puede superar 24 cuotas."),
    loanDate: businessDate,
    dueDate: z
      .string()
      .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Selecciona una fecha válida."),
    note: z.string().trim().max(500, "La nota no puede superar 500 caracteres."),
  })
  .superRefine((value, ctx) => {
    if (value.customerId === "__new__" && !value.newCustomerName) {
      ctx.addIssue({ code: "custom", path: ["newCustomerName"], message: "Escribe el nombre del cliente." });
    }
    if (value.dueDate && value.loanDate > value.dueDate) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "La fecha de vencimiento no puede ser anterior a la del préstamo." });
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
