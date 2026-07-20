import { createMiddleware } from 'hono/factory'
import { verifyInternalAssertion } from '@oikentra/internal-auth'

import { getConfig } from '../../config/config'
import { AppError } from '../errors'
import type { AppBindings } from '../request-context'

export const requireAuthHeaders = createMiddleware<AppBindings>(async (c, next) => {
  const config = getConfig()

  if (config.internalAuthDevBypass.enabled) {
    c.set('auth', {
      userId: config.internalAuthDevBypass.userId,
      sessionId: config.internalAuthDevBypass.sessionId,
    })
    await next()
    return
  }

  const token = c.req.header('X-Internal-Auth')?.trim()

  if (!token) {
    throw new AppError('UNAUTHENTICATED', 401, 'A valid authenticated session is required.')
  }

  try {
    const assertion = await verifyInternalAssertion({
      token,
      publicKeyBase64: config.internalAuthPublicKeyBase64,
      audience: config.internalAuthAudience,
    })
    c.set('auth', { userId: assertion.userId, sessionId: assertion.sessionId })
  } catch {
    throw new AppError('UNAUTHENTICATED', 401, 'A valid authenticated session is required.')
  }

  await next()
})
