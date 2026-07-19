import { Hono } from 'hono'
import type { Context } from 'hono'

import { auth } from '../../auth'
import { ProfileValidationError, profileService } from './profile.service'
import { patchProfileSchema, replaceProfileSchema } from './profile.schemas'

type ProfileBindings = { Variables: { requestId: string } }
type ProfileContext = Context<ProfileBindings>

export const profileRoutes = new Hono<ProfileBindings>()

async function getSession(c: ProfileContext) {
  const headers = new Headers(c.req.raw.headers)
  headers.set('X-Request-Id', c.get('requestId'))
  return auth.api.getSession({ headers })
}

function validationResponse(c: ProfileContext, error: { issues: { path: unknown; message: string }[] }) {
  return c.json(
    {
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid data.',
      details: error.issues.map((issue) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path),
        message: issue.message,
      })),
      requestId: c.get('requestId'),
    },
    400,
  )
}

profileRoutes.get('/', async (c) => {
  const session = await getSession(c)
  if (!session) return c.json({ code: 'UNAUTHENTICATED', message: 'A valid session is required.', requestId: c.get('requestId') }, 401)
  return c.json({ data: await profileService.get(session.user.id), requestId: c.get('requestId') })
})

profileRoutes.put('/', async (c) => {
  const session = await getSession(c)
  if (!session) return c.json({ code: 'UNAUTHENTICATED', message: 'A valid session is required.', requestId: c.get('requestId') }, 401)
  const parsed = replaceProfileSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationResponse(c, parsed.error)
  return c.json({ data: await profileService.replace(session.user.id, parsed.data), requestId: c.get('requestId') })
})

profileRoutes.patch('/', async (c) => {
  const session = await getSession(c)
  if (!session) return c.json({ code: 'UNAUTHENTICATED', message: 'A valid session is required.', requestId: c.get('requestId') }, 401)
  const parsed = patchProfileSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationResponse(c, parsed.error)
  try {
    return c.json({ data: await profileService.patch(session.user.id, parsed.data), requestId: c.get('requestId') })
  } catch (error) {
    if (error instanceof ProfileValidationError) return validationResponse(c, { issues: error.issues })
    throw error
  }
})
