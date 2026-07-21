import { z } from "zod";
export const invitationFormSchema = z.object({
  identifier: z.string().trim().min(3, "Escribe un correo o teléfono.").refine((value) => value.includes("@") ? z.string().email().safeParse(value).success : /^\+?[0-9 ()-]{7,20}$/.test(value), "Ingresa un correo o número de teléfono válido."),
  role: z.enum(["MANAGER", "OPERATOR"]),
});
export type InvitationFormValues = z.infer<typeof invitationFormSchema>;
