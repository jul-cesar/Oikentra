import { Hono } from 'hono'

import { auth } from './auth'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Oikentra auth service')
})

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
