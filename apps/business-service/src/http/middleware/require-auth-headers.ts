import { createMiddleware } from 'hono/factory'

import { config } from '../../config/config'
import { AppError } from '../errors'
import type { AppBindings } from '../request-context'

export const requireAuthHeaders = createMiddleware<AppBindings>(async (c, next) => {
  const gatewaySecret = c.req.header('X-Gateway-Secret')?.trim()
  const userId = c.req.header('X-User-Id')?.trim()
  const sessionId = c.req.header('X-Session-Id')?.trim()

  if (gatewaySecret !== config.gatewaySharedSecret || !userId || !sessionId) {
    throw new AppError('UNAUTHENTICATED', 401, 'A valid authenticated session is required.')
  }

  c.set('auth', { userId, sessionId })

  await next()
})
