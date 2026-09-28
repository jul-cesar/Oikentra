import { afterEach, describe, expect, test } from 'bun:test'

import { getConfig } from './config'

const originalEnv = new Map<string, string | undefined>()

function setEnv(values: Record<string, string>) {
  for (const name of ['DATABASE_URL', 'INTERNAL_AUTH_PUBLIC_KEY_B64', 'NODE_ENV', 'INTERNAL_AUTH_DEV_BYPASS', 'INTERNAL_AUTH_DEV_USER_ID', 'INTERNAL_AUTH_DEV_USER_EMAIL']) {
    originalEnv.set(name, process.env[name])
  }

  Object.assign(process.env, values)
}

afterEach(() => {
  for (const [name, value] of originalEnv) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  originalEnv.clear()
})

describe('development auth bypass config', () => {
  test('enables only in development with the explicit flag', () => {
    setEnv({ DATABASE_URL: 'postgres://localhost/test', INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key', NODE_ENV: 'development', INTERNAL_AUTH_DEV_BYPASS: 'true', INTERNAL_AUTH_DEV_USER_ID: 'test-user', INTERNAL_AUTH_DEV_USER_EMAIL: 'owner@example.com' })

    expect(getConfig().internalAuthDevBypass).toEqual({ enabled: true, userId: 'test-user', sessionId: 'local-test-session', email: 'owner@example.com' })
  })

  test('does not invent an email for the development identity', () => {
    setEnv({ DATABASE_URL: 'postgres://localhost/test', INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key', NODE_ENV: 'development', INTERNAL_AUTH_DEV_BYPASS: 'true' })
    delete process.env.INTERNAL_AUTH_DEV_USER_EMAIL

    expect(getConfig().internalAuthDevBypass.email).toBeUndefined()
  })

  test('forces the bypass off outside development', () => {
    setEnv({ DATABASE_URL: 'postgres://localhost/test', INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key', NODE_ENV: 'production', INTERNAL_AUTH_DEV_BYPASS: 'true' })

    expect(getConfig().internalAuthDevBypass.enabled).toBe(false)
  })
})
