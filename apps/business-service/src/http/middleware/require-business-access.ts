import { and, eq, isNull } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'

import { db } from '../../db/client'
import { businesses } from '../../db/schema'
import { AppError } from '../errors'
import type { AppBindings } from '../request-context'

export const requireBusinessAccess = createMiddleware<AppBindings>(async (c, next) => {
  const userId = c.get('auth').userId
  const businessId = c.req.param('businessId')

  if (!businessId) {
    throw new AppError('VALIDATION_ERROR', 400, 'Missing businessId in path.')
  }

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      currencyCode: businesses.currencyCode,
      timezone: businesses.timezone,
      status: businesses.status,
    })
    .from(businesses)
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.ownerUserId, userId),
        isNull(businesses.deletedAt),
      ),
    )
    .limit(1)

  if (!business) {
    throw new AppError('BUSINESS_NOT_FOUND', 404, 'The business was not found.')
  }

  c.set('business', business)

  await next()
})
