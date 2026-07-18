import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import type { RequestLogEnv } from '@oikentra/http-logging'
import { logError, requestIdMiddleware, requestLoggerMiddleware } from '@oikentra/http-logging'

import { auth } from './auth'
import { checkDatabaseConnection } from './db/client'
import { config } from './config/config'

const app = new Hono<RequestLogEnv>()
app.use('*', requestIdMiddleware())
app.use('*', requestLoggerMiddleware('auth-service'))
app.use(
  '/api/auth/*',
  cors({
    origin: config.webUrl,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  }),
)

function liveResponse(c: Context) {
  return c.json({ status: 'ok', service: 'auth-service' })
}

async function readyResponse(c: Context) {
  try {
    await checkDatabaseConnection()

    return c.json({ status: 'ready', service: 'auth-service' })
  } catch {
    return c.json({ status: 'not_ready', service: 'auth-service' }, 503)
  }
}

app.get('/', (c) => {
  return c.text('Oikentra auth service')
})

app.get('/api/auth/health/live', liveResponse)

app.get('/internal/session/validate', async (c) => {
  const headers = new Headers(c.req.raw.headers)
  headers.set('X-Request-Id', c.get('requestId'))
  const session = await auth.api.getSession({
    headers,
  })

  if (!session) {
    return c.json(
      {
        code: 'UNAUTHENTICATED',
        message: 'The session is not valid.',
      },
      401,
    )
  }

  c.header('X-User-Id', session.user.id)
  c.header('X-Session-Id', session.session.id)

  return c.body(null, 204)
})

app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const headers = new Headers(c.req.raw.headers)
  headers.set('X-Request-Id', c.get('requestId'))
  return auth.handler(new Request(c.req.raw, { headers }))
})

app.onError((error, c) => {
  logError('auth-service', error, c, 500)
  return c.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' }, 500)
})

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
}
