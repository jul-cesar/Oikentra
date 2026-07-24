import { Hono } from 'hono'

import { validationError } from '../../http/errors'
import type { AppBindings } from '../../http/request-context'
import { success } from '../../http/response'
import { requireAuthHeaders } from '../../http/middleware/require-auth-headers'
import { cashMovementCategoriesService } from './cash-movement-categories.service'
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamsSchema,
} from './cash-movement-categories.schemas'

export const cashMovementCategoriesRoutes = new Hono<AppBindings>()

cashMovementCategoriesRoutes.use('*', requireAuthHeaders)

cashMovementCategoriesRoutes.post('/', async (c) => {
  const parsedBody = createCategorySchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const category = await cashMovementCategoriesService.create(
    c.get('auth').userId,
    c.req.param('businessId')!,
    parsedBody.data,
  )

  return success(c, category, 201)
})

cashMovementCategoriesRoutes.get('/', async (c) => {
  const categories = await cashMovementCategoriesService.list(
    c.get('auth').userId,
    c.req.param('businessId')!,
  )

  return success(c, categories)
})

cashMovementCategoriesRoutes.put('/:categoryId', async (c) => {
  const parsedParams = categoryIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const parsedBody = updateCategorySchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const category = await cashMovementCategoriesService.update(
    c.get('auth').userId,
    parsedParams.data.businessId,
    parsedParams.data.categoryId,
    parsedBody.data,
  )

  return success(c, category)
})

cashMovementCategoriesRoutes.post('/:categoryId/deactivate', async (c) => {
  const parsedParams = categoryIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const category = await cashMovementCategoriesService.deactivate(
    c.get('auth').userId,
    parsedParams.data.businessId,
    parsedParams.data.categoryId,
  )

  return success(c, category)
})
