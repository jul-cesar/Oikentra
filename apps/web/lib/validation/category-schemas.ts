import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(80, "El nombre no puede superar 80 caracteres."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
