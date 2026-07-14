import { Hono } from 'hono'
import type { Context } from 'hono'

import { auth } from './auth'
import { checkDatabaseConnection } from './db/client'

const app = new Hono()

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
app.get('/api/auth/health/ready', readyResponse)

app.get('/internal/session/validate', async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
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

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
}
