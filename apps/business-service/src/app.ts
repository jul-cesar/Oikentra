import { Hono } from 'hono'

import { checkDatabaseConnection } from './db/health'
import { AppError } from './http/errors'
import { requestIdMiddleware } from './http/middleware/request-id'
import type { AppBindings } from './http/request-context'
import { success } from './http/response'
import { businessesRoutes } from './modules/businesses/businesses.routes'

export const app = new Hono<AppBindings>()

app.use('*', requestIdMiddleware)

app.get('/api/business/health/live', (c) => {
  return success(c, { status: 'ok', service: 'business-service' })
})

app.get('/api/business/health/ready', async (c) => {
  try {
    await checkDatabaseConnection()
  } catch (error) {
    throw new AppError('DEPENDENCY_UNAVAILABLE', 503, 'The database is unavailable.')
  }

  return success(c, { status: 'ready', service: 'business-service' })
})

app.route('/api/business/businesses', businessesRoutes)

app.onError((error, c) => {
  const requestId = c.get('requestId') ?? crypto.randomUUID()

  if (error instanceof AppError) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'business-service',
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: error.status,
        errorCode: error.code,
      }),
    )

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

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'business-service',
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
    }),
  )
  console.error(error)

  return c.json(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal error occurred.',
      details: null,
      requestId,
    },
    500,
  )
})
