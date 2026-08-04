import { z } from "zod";

export const createPaymentMethodSchema = z.object({
	name: z.string().trim().min(1).max(80),
});

export const updatePaymentMethodSchema = z.object({
	name: z.string().trim().min(1).max(80),
});

export const paymentMethodIdParamsSchema = z.object({
	businessId: z.string().min(1),
	paymentMethodId: z.string().min(1),
});
