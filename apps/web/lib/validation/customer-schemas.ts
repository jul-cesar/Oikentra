import { z } from "zod";

export const createCustomerFormSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del cliente.").max(120),
  phone: z.string().trim().max(30, "El teléfono no puede superar 30 caracteres."),
  notes: z.string().trim().max(500, "Las notas no pueden superar 500 caracteres."),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerFormSchema>;
