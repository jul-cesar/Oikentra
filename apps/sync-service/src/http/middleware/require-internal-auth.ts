import { verifyInternalAssertion } from '@oikentra/internal-auth'
import { createMiddleware } from 'hono/factory'

import { config } from '../../config'

export type SyncAuthEnv = {
  Variables: {
    auth: {
      userId: string
      sessionId: string
    }
  }
}

export const requireInternalAuth = createMiddleware<SyncAuthEnv>(async (c, next) => {
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
