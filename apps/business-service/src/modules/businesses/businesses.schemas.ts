import { z } from 'zod'

import { businessStatuses } from '../../db/schema'

export const businessIdParamsSchema = z.object({
  businessId: z.string().uuid(),
})

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1).max(120),
  businessType: z.string().trim().min(1).max(80).optional(),
  currencyCode: z.string().trim().length(3).toUpperCase().optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
})

export const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    businessType: z.string().trim().min(1).max(80).nullable().optional(),
    currencyCode: z.string().trim().length(3).toUpperCase().optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    status: z.enum(businessStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })
