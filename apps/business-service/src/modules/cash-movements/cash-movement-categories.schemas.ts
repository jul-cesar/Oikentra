import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const categoryIdParamsSchema = z.object({
  businessId: z.string().min(1),
  categoryId: z.string().min(1),
})
