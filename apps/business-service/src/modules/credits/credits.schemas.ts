import { z } from 'zod'

export const createCreditSchema = z.object({
  customerId: z.string().min(1),
  originalAmount: z.number().int().positive(),
  description: z.string().trim().max(500).optional(),
  creditDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
})

export const creditIdParamsSchema = z.object({
  businessId: z.string().min(1),
  creditId: z.string().min(1),
})

export const paymentIdParamsSchema = z.object({
  businessId: z.string().min(1),
  creditId: z.string().min(1),
  paymentId: z.string().min(1),
})

export const createCreditPaymentSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
})

export const cancelCreditSchema = z.object({
  reason: z.string().trim().min(1).max(500),
})

export const cancelPaymentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
})

export const creditFiltersSchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
})
