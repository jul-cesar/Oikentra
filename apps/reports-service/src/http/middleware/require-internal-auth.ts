import { verifyInternalAssertion } from '@oikentra/internal-auth'
import { createMiddleware } from 'hono/factory'

import { getConfig } from '../../config'

export type ReportsAuthEnv = {
  Variables: {
    auth: {
      userId: string
      sessionId: string
    }
  }
}

export const requireInternalAuth = createMiddleware<ReportsAuthEnv>(async (c, next) => {
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
  if (!token) return c.json({ code: 'UNAUTHENTICATED', message: 'A valid authenticated session is required.' }, 401)

  try {
    const assertion = await verifyInternalAssertion({ token, publicKeyBase64: config.internalAuthPublicKeyBase64, audience: config.internalAuthAudience })
    c.set('auth', { userId: assertion.userId, sessionId: assertion.sessionId })
  } catch {
    return c.json({ code: 'UNAUTHENTICATED', message: 'A valid authenticated session is required.' }, 401)
  }

  await next()
})
