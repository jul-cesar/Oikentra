import { Hono } from 'hono'

import { validationError } from '../../http/errors'
import type { AppBindings } from '../../http/request-context'
import { success } from '../../http/response'
import { requireAuthHeaders } from '../../http/middleware/require-auth-headers'
import { cashMovementsService } from './cash-movements.service'
import {
  cashMovementIdParamsSchema,
  cancelCashMovementSchema,
  createExpenseSchema,
  createSaleSchema,
} from './cash-movements.schemas'

export const cashMovementsRoutes = new Hono<AppBindings>()

cashMovementsRoutes.use('*', requireAuthHeaders)
// cashMovementsRoutes.use("*", async (c, next) => {
//   c.set("auth", {
//     userId: "test-user-123",
//     sessionId: "test-session-456",
//   })

//   await next()
// })

cashMovementsRoutes.post('/sales', async (c) => {
  const parsedBody = createSaleSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const movement = await cashMovementsService.createSale(
    c.get('auth').userId,
    c.req.param('businessId')!,
    parsedBody.data,
  )

  return success(c, movement, 201)
})

cashMovementsRoutes.post('/expenses', async (c) => {
  const parsedBody = createExpenseSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const movement = await cashMovementsService.createExpense(
    c.get('auth').userId,
    c.req.param('businessId')!,
    parsedBody.data,
  )

  return success(c, movement, 201)
})

cashMovementsRoutes.get('/', async (c) => {
  const records = await cashMovementsService.list(
    c.get('auth').userId,
    c.req.param('businessId')!,
  )

  return success(c, records)
})

cashMovementsRoutes.post('/:movementId/cancel', async (c) => {
  const parsedParams = cashMovementIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const parsedBody = cancelCashMovementSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const movement = await cashMovementsService.cancel(
    c.get('auth').userId,
    parsedParams.data.movementId,
    parsedParams.data.businessId,
    parsedBody.data,
  )

  return success(c, movement)
})
