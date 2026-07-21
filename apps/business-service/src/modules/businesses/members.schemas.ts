import { z } from "zod";
import { memberRoles } from "../../db/schema";

export const memberParamsSchema = z.object({
  businessId: z.string().min(1),
  memberId: z.string().min(1),
});
export const addMemberSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(memberRoles).default("OPERATOR"),
});
export const createInvitationSchema = z
  .object({
    identifier: z.string().trim().min(3),
    targetUserId: z.string().trim().min(1),
    role: z.enum(memberRoles).default("OPERATOR"),
  })
  .superRefine((value, ctx) => {
    const isEmail = value.identifier.includes("@");
    if (isEmail && !z.string().email().safeParse(value.identifier).success)
      ctx.addIssue({
        code: "custom",
        path: ["identifier"],
        message: "Ingresa un correo válido.",
      });
    if (!isEmail && !/^\+?[0-9 ()-]{7,20}$/.test(value.identifier))
      ctx.addIssue({
        code: "custom",
        path: ["identifier"],
        message: "Ingresa un número de teléfono válido.",
      });
  });
export const invitationParamsSchema = z.object({
  businessId: z.string().min(1),
  invitationId: z.string().min(1),
});
export const updateMemberSchema = z.object({ role: z.enum(memberRoles) });
