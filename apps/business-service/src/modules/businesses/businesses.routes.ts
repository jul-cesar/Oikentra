import { Hono } from 'hono'

import { validationError } from '../../http/errors'
import type { AppBindings } from '../../http/request-context'
import { success } from '../../http/response'
import { requireAuthHeaders } from '../../http/middleware/require-auth-headers'
import { businessesService } from './businesses.service'
import {
  businessIdParamsSchema,
  createBusinessSchema,
  updateBusinessSchema,
} from './businesses.schemas'

export const businessesRoutes = new Hono<AppBindings>()

//businessesRoutes.use('*', requireAuthHeaders)
 businessesRoutes.use("*", async (c, next) => {
   c.set("auth", {
     userId: "test-user-123",
     sessionId: "test-session-456",
   })

   await next()
 })

businessesRoutes.post('/', async (c) => {
  const parsed = createBusinessSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsed.success) {
    throw validationError(parsed.error)
  }

  const business = await businessesService.create(c.get('auth').userId, parsed.data)

  return success(c, business, 201)
})

businessesRoutes.get('/', async (c) => {
  const records = await businessesService.list(c.get('auth').userId)

  return success(c, records)
})

businessesRoutes.get('/:businessId', async (c) => {
  const parsedParams = businessIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const business = await businessesService.get(c.get('auth').userId, parsedParams.data.businessId)

  return success(c, business)
})

businessesRoutes.post('/:businessId/delete', async (c) => {
  const parsedParams = businessIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const business = await businessesService.softDelete(
    c.get('auth').userId,
    parsedParams.data.businessId,
  )

  return success(c, business)
})

businessesRoutes.patch('/:businessId', async (c) => {
  const parsedParams = businessIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const parsedBody = updateBusinessSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const business = await businessesService.update(
    c.get('auth').userId,
    parsedParams.data.businessId,
    parsedBody.data,
  )

  return success(c, business)
})
