import { z } from 'zod'

import { customerStatuses } from '../../db/schema'

export const customerIdParamsSchema = z.object({
  businessId: z.string().min(1),
  customerId: z.string().min(1),
})

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    status: z.enum(customerStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })
