import { z } from 'zod'

import { businessStatuses, businessTypes } from '../../db/schema'

export const businessIdParamsSchema = z.object({
  businessId: z.string().min(1),
})

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1).max(120),
  businessType: z.enum(businessTypes).optional(),
  currencyCode: z.string().trim().length(3).toUpperCase().optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
})

export const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    businessType: z.enum(businessTypes).nullable().optional(),
    currencyCode: z.string().trim().length(3).toUpperCase().optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    status: z.enum(businessStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })
