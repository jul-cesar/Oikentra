import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import type { AppBindings } from './request-context'

export function success<T>(c: Context<AppBindings>, data: T, status: ContentfulStatusCode = 200) {
  return c.json(
    {
      data,
      meta: null,
      requestId: c.get('requestId'),
    },
    status,
  )
}
