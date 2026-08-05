import { Hono } from 'hono'
import { logError, requestIdMiddleware, requestLoggerMiddleware } from '@oikentra/http-logging'

import { AppError } from './http/errors'
import type { AppBindings } from './http/request-context'
import { success } from './http/response'
import { reportsRoutes } from './modules/reports/reports.routes'

export const app = new Hono<AppBindings>()

app.use('*', requestIdMiddleware())
app.use('*', requestLoggerMiddleware('reports-service'))

app.get('/api/reports/health/live', (c) => {
  return success(c, { status: 'ok', service: 'reports-service' })
})

app.get('/api/reports/health/ready', (c) => {
  return success(c, { status: 'ready', service: 'reports-service' })
})

app.route('/api/reports/businesses', reportsRoutes)

app.onError((error, c) => {
  const requestId = c.get('requestId') ?? crypto.randomUUID()

  if (error instanceof AppError) {
    logError('reports-service', error, c, error.status)
    return c.json(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
      error.status,
    )
  }

  console.error(error)

  return c.json(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal error occurred.',
      details: error instanceof Error ? error.message : null,
      requestId,
    },
    500,
  )
})
