import { afterEach, describe, expect, test } from 'bun:test'

import { getConfig } from './config'

const requiredValues = {
  DATABASE_URL: 'postgres://localhost/test',
  BETTER_AUTH_SECRET: 'test-secret',
  BETTER_AUTH_URL: 'http://localhost:3001',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  RESEND_API_KEY: 'resend-api-key',
  AUTH_EMAIL_FROM: 'auth@example.com',
  WEB_URL: 'http://localhost:3000',
  INTERNAL_AUTH_PRIVATE_KEY_B64: 'private-key',
} as const

const originalEnv = new Map<string, string | undefined>()

function setRequiredEnv() {
  originalEnv.set('AUTH_COOKIE_DOMAIN', process.env.AUTH_COOKIE_DOMAIN)

  for (const [name, value] of Object.entries(requiredValues)) {
    originalEnv.set(name, process.env[name])
    process.env[name] = value
  }
}

afterEach(() => {
  for (const [name, value] of originalEnv) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  originalEnv.clear()

})

describe('runtime config', () => {
  test('leaves the cookie domain unset by default', () => {
    setRequiredEnv()

    expect(getConfig().authCookieDomain).toBeUndefined()
  })

  test('accepts a shared parent cookie domain', () => {
    setRequiredEnv()
    process.env.AUTH_COOKIE_DOMAIN = 'oikentra.com'

    expect(getConfig().authCookieDomain).toBe('oikentra.com')
  })

  test('rejects values that are not cookie domains', () => {
    setRequiredEnv()
    process.env.AUTH_COOKIE_DOMAIN = 'https://oikentra.com/path'

    expect(() => getConfig()).toThrow('AUTH_COOKIE_DOMAIN must be a valid cookie domain')
  })
})
