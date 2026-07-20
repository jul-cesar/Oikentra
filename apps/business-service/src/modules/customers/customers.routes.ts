import { Hono } from 'hono'

import { validationError } from '../../http/errors'
import type { AppBindings } from '../../http/request-context'
import { success } from '../../http/response'
import { customersService } from './customers.service'
import {
  customerIdParamsSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from './customers.schemas'
import { requireAuthHeaders } from '../../http/middleware/require-auth-headers'

export const customersRoutes = new Hono<AppBindings>()

customersRoutes.use('*', requireAuthHeaders)
// customersRoutes.use("*", async (c, next) => {
//   c.set("auth", {
//     userId: "test-user-123",
//     sessionId: "test-session-456",
//   })

//   await next()
// })

customersRoutes.get('/', async (c) => {
  const parsedParams = customerIdParamsSchema.pick({ businessId: true }).safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const records = await customersService.list(c.get('auth').userId, parsedParams.data.businessId)

  return success(c, records)
})

customersRoutes.post('/', async (c) => {
  const parsedParams = customerIdParamsSchema.pick({ businessId: true }).safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const parsed = createCustomerSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsed.success) {
    throw validationError(parsed.error)
  }

  const customer = await customersService.create(
    c.get('auth').userId,
    parsedParams.data.businessId,
    parsed.data,
  )

  return success(c, customer, 201)
})

customersRoutes.get('/:customerId', async (c) => {
  const parsedParams = customerIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const customer = await customersService.get(
    c.get('auth').userId,
    parsedParams.data.customerId,
    parsedParams.data.businessId,
  )

  return success(c, customer)
})

customersRoutes.post('/:customerId/delete', async (c) => {
  const parsedParams = customerIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const customer = await customersService.softDelete(
    c.get('auth').userId,
    parsedParams.data.customerId,
    parsedParams.data.businessId,
  )

  return success(c, customer)
})

customersRoutes.patch('/:customerId', async (c) => {
  const parsedParams = customerIdParamsSchema.safeParse(c.req.param())

  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const parsedBody = updateCustomerSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const customer = await customersService.update(
    c.get('auth').userId,
    parsedParams.data.customerId,
    parsedParams.data.businessId,
    parsedBody.data,
  )

  return success(c, customer)
})
