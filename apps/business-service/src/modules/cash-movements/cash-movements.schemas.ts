import { z } from "zod";

export const cashMovementIdParamsSchema = z.object({
	businessId: z.string().min(1),
	movementId: z.string().min(1),
});

export const createSaleSchema = z.object({
	amount: z.number().int().positive(),
	category: z.string().trim().max(80).optional(),
	paymentMethod: z.string().trim().max(80).optional(),
	note: z.string().trim().max(500).optional(),
	businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
	occurredAt: z.string().datetime({ offset: true }),
});

export const createExpenseSchema = z.object({
	amount: z.number().int().positive(),
	category: z.string().trim().max(80).optional(),
	paymentMethod: z.string().trim().max(80).optional(),
	note: z.string().trim().max(500).optional(),
	businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
	occurredAt: z.string().datetime({ offset: true }),
});

export const cancelCashMovementSchema = z.object({
	reason: z.string().trim().min(1).max(500),
});
