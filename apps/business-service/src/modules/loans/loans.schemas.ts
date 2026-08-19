import { z } from "zod";

export const createLoanSchema = z.object({
	customerId: z.string().min(1),
	capitalAmount: z.number().int().positive(),
	interestRate: z.number().min(0).max(100),
	frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
	termCount: z.number().int().min(1).max(360),
	description: z.string().trim().max(500).optional(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export const loanIdParamsSchema = z.object({
	businessId: z.string().min(1),
	loanId: z.string().min(1),
});

export const loanPaymentIdParamsSchema = z.object({
	businessId: z.string().min(1),
	loanId: z.string().min(1),
	paymentId: z.string().min(1),
});

export const createLoanPaymentSchema = z.object({
	id: z.string().uuid().optional(),
	amount: z.number().int().positive(),
	note: z.string().trim().max(500).optional(),
	paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export const cancelLoanSchema = z.object({
	reason: z.string().trim().min(1).max(500),
});

export const cancelLoanPaymentSchema = z.object({
	reason: z.string().trim().min(1).max(500),
});

export const loanFiltersSchema = z.object({
	customerId: z.string().optional(),
	status: z.enum(["ACTIVE", "PAID", "DEFAULT", "CANCELLED"]).optional(),
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.string().optional(),
});
