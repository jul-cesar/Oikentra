import { Hono } from 'hono'
import { logError, requestIdMiddleware, requestLoggerMiddleware } from '@oikentra/http-logging'
import { requireInternalAuth } from './http/middleware/require-internal-auth'
import type { ReportsAuthEnv } from './http/middleware/require-internal-auth'
import { validateRuntimeConfig } from './config'

const app = new Hono<ReportsAuthEnv>()
app.use('*', requestIdMiddleware())
app.use('*', requestLoggerMiddleware('reports-service'))
app.use('/api/reports/*', requireInternalAuth)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.onError((error, c) => {
  logError('reports-service', error, c, 500)
  return c.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' }, 500)
})

if (import.meta.main) validateRuntimeConfig()

export default app
