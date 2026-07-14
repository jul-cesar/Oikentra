import { createMiddleware } from 'hono/factory'
import { z } from 'zod'

import type { AppBindings } from '../request-context'

const requestIdSchema = z.string().uuid()

export const requestIdMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  const incomingRequestId = c.req.header('X-Request-Id')
  const parsedRequestId = requestIdSchema.safeParse(incomingRequestId)
  const requestId = parsedRequestId.success ? parsedRequestId.data : crypto.randomUUID()

  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)

  await next()
})
