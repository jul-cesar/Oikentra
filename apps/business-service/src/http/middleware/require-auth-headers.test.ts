import { afterEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'

import type { AppBindings } from '../request-context'
import { requireAuthHeaders } from './require-auth-headers'

const originalEnv = new Map<string, string | undefined>()

afterEach(() => {
  for (const [name, value] of originalEnv) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  originalEnv.clear()
})

describe('requireAuthHeaders development bypass', () => {
  test('sets local auth context without an internal assertion', async () => {
    for (const name of ['DATABASE_URL', 'INTERNAL_AUTH_PUBLIC_KEY_B64', 'NODE_ENV', 'INTERNAL_AUTH_DEV_BYPASS']) {
      originalEnv.set(name, process.env[name])
    }
    Object.assign(process.env, {
      DATABASE_URL: 'postgres://localhost/test',
      INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key',
      NODE_ENV: 'development',
      INTERNAL_AUTH_DEV_BYPASS: 'true',
    })

    const app = new Hono<AppBindings>()
    app.use('*', requireAuthHeaders)
    app.get('/', (c) => c.json(c.get('auth')))

    const response = await app.request('/')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ userId: 'local-test-user', sessionId: 'local-test-session' })
  })
})
