import type { Env } from 'hono'

export type AuthContext = {
  userId: string
  sessionId: string
}

export type AppBindings = Env & {
  Variables: {
    requestId: string
    auth: AuthContext
  }
}
