import { afterEach, describe, expect, test } from 'bun:test'

import { getConfig } from './config'

const originalEnv = new Map<string, string | undefined>()

function setEnv(values: Record<string, string>) {
  for (const name of ['INTERNAL_AUTH_PUBLIC_KEY_B64', 'NODE_ENV', 'INTERNAL_AUTH_DEV_BYPASS', 'INTERNAL_AUTH_DEV_USER_ID']) {
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
  test('enables in development and uses the deterministic session context', () => {
    setEnv({ INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key', NODE_ENV: 'development', INTERNAL_AUTH_DEV_BYPASS: 'true' })

    expect(getConfig().internalAuthDevBypass).toEqual({ enabled: true, userId: 'local-test-user', sessionId: 'local-test-session' })
  })

  test('forces the bypass off in production', () => {
    setEnv({ INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key', NODE_ENV: 'production', INTERNAL_AUTH_DEV_BYPASS: 'true' })

    expect(getConfig().internalAuthDevBypass.enabled).toBe(false)
  })
})
