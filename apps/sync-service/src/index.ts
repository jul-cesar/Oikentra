import { Hono } from 'hono'
import { logError, requestIdMiddleware, requestLoggerMiddleware } from '@oikentra/http-logging'
import { requireInternalAuth } from './http/middleware/require-internal-auth'
import type { SyncAuthEnv } from './http/middleware/require-internal-auth'
import { validateRuntimeConfig } from './config'

const app = new Hono<SyncAuthEnv>()
app.use('*', requestIdMiddleware())
app.use('*', requestLoggerMiddleware('sync-service'))
app.use('/api/sync/*', requireInternalAuth)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.onError((error, c) => {
  logError('sync-service', error, c, 500)
  return c.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' }, 500)
})

if (import.meta.main) validateRuntimeConfig()

export default app
