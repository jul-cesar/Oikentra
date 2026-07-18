import { createMiddleware } from 'hono/factory'
import type { Context, Env, MiddlewareHandler } from 'hono'

export type RequestLogEnv = {
  Variables: {
    requestId: string
  }
}

export type RequestLog = {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  service: string
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  errorCategory?: string
  stack?: string
}

const validRequestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getRequestId(value: string | undefined) {
  return value && validRequestId.test(value.trim()) ? value.trim() : crypto.randomUUID()
}

export function requestIdMiddleware<E extends Env = RequestLogEnv>(): MiddlewareHandler<E> {
  return createMiddleware<E>(async (c, next) => {
    const requestId = getRequestId(c.req.header('X-Request-Id'))
    c.set('requestId' as never, requestId as never)
    c.header('X-Request-Id', requestId)
    await next()
  })
}

function levelForStatus(status: number): RequestLog['level'] {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warn'
  return 'info'
}

function safeStack(error: unknown) {
  if (!(error instanceof Error)) return undefined
  return error.stack?.replace(/([?&](?:token|code|password|secret|key|session)[^=\s)]*=)[^&\s)]*/gi, '$1<redacted>')
}

export function errorCategory(error: unknown) {
  if (error instanceof Error && error.name) return error.name
  return typeof error === 'object' && error !== null ? 'ObjectError' : 'UnknownError'
}

export function logRequest(fields: Omit<RequestLog, 'timestamp' | 'level'> & { level?: RequestLog['level'] }) {
  const entry: RequestLog = {
    timestamp: new Date().toISOString(),
    level: fields.level ?? levelForStatus(fields.status),
    ...fields,
  }
  const output = JSON.stringify(entry)
  if (entry.level === 'error') console.error(output)
  else if (entry.level === 'warn') console.warn(output)
  else console.info(output)
}

export function requestLoggerMiddleware(service: string): MiddlewareHandler<RequestLogEnv> {
  return createMiddleware<RequestLogEnv>(async (c, next) => {
    const startedAt = performance.now()
    try {
      await next()
    } finally {
      logRequest({
        service,
        requestId: c.get('requestId'),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      })
    }
  })
}

export function logError<E extends Env>(service: string, error: unknown, c: Context<E>, status: number) {
  logRequest({
    service,
    requestId: (c.get('requestId' as never) as string | undefined) ?? crypto.randomUUID(),
    method: c.req.method,
    path: c.req.path,
    status,
    durationMs: 0,
    errorCategory: errorCategory(error),
    stack: safeStack(error),
  })
}
