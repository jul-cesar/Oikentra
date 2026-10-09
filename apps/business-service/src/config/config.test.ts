import { afterEach, describe, expect, test } from 'bun:test'

import { getConfig } from './config'

const originalEnv = new Map<string, string | undefined>()
const configEnvNames = [
  'DATABASE_URL',
  'INTERNAL_AUTH_PUBLIC_KEY_B64',
  'NODE_ENV',
  'INTERNAL_AUTH_DEV_BYPASS',
  'INTERNAL_AUTH_DEV_USER_ID',
  'INTERNAL_AUTH_DEV_USER_EMAIL',
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BASE_URL',
  'R2_PRIVATE_BUCKET',
]

function setEnv(values: Record<string, string | undefined>) {
  for (const name of configEnvNames) {
    if (!originalEnv.has(name)) originalEnv.set(name, process.env[name])
    const value = values[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
}

afterEach(() => {
  for (const [name, value] of originalEnv) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  originalEnv.clear()
})

describe('R2 configuration', () => {
  const requiredEnv = {
    DATABASE_URL: 'postgres://localhost/test',
    INTERNAL_AUTH_PUBLIC_KEY_B64: 'test-key',
  }
  const privateR2Env = {
    R2_ACCOUNT_ID: 'account-id',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
    R2_PRIVATE_BUCKET: 'task-attachments',
  }

  test('exposes the private bucket without a public base URL', () => {
    setEnv({ ...requiredEnv, ...privateR2Env })

    expect(getConfig().r2PrivateBucket).toEqual({
      accountId: 'account-id',
      bucket: 'task-attachments',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
    })
  })

  test('requires R2 account credentials and a private bucket name', () => {
    for (const missingName of Object.keys(privateR2Env)) {
      const env = { ...requiredEnv, ...privateR2Env, [missingName]: undefined }
      setEnv(env)

      expect(getConfig().r2PrivateBucket).toBeNull()
    }
  })

  test('keeps the existing public logo configuration', () => {
    setEnv({
      ...requiredEnv,
      R2_ACCOUNT_ID: 'account-id',
      R2_BUCKET: 'logo-bucket',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
      R2_PUBLIC_BASE_URL: 'https://assets.example.test/',
    })

    expect(getConfig().r2).toEqual({
      accountId: 'account-id',
      bucket: 'logo-bucket',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      publicBaseUrl: 'https://assets.example.test',
    })
  })
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
