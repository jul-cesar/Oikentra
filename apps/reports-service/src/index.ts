import { Hono } from 'hono'
import { logError, requestIdMiddleware, requestLoggerMiddleware } from '@oikentra/http-logging'

const app = new Hono()
app.use('*', requestIdMiddleware())
app.use('*', requestLoggerMiddleware('reports-service'))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.onError((error, c) => {
  logError('reports-service', error, c, 500)
  return c.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' }, 500)
})

export default app
