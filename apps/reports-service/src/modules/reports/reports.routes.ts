import { Hono } from 'hono'

import { validationError } from '../../http/errors'
import type { AppBindings } from '../../http/request-context'
import { requireAuthHeaders } from '../../http/middleware/require-auth-headers'
import { generateReport } from './reports.service'
import { generateReportSchema, reportParamsSchema } from './reports.schemas'

export const reportsRoutes = new Hono<AppBindings>()

reportsRoutes.use('*', requireAuthHeaders)

reportsRoutes.post('/:businessId/generate', async (c) => {
  const parsedParams = reportParamsSchema.safeParse(c.req.param())
  if (!parsedParams.success) {
    throw validationError(parsedParams.error)
  }

  const parsedBody = generateReportSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsedBody.success) {
    throw validationError(parsedBody.error)
  }

  const result = await generateReport(parsedParams.data.businessId, parsedBody.data, c.req.header('X-Internal-Auth')?.trim())

  const disposition = parsedBody.data.disposition === 'INLINE' ? 'inline' : 'attachment'

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `${disposition}; filename="${result.filename}"`,
      'X-Request-Id': c.get('requestId'),
    },
  })
})
