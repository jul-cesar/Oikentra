function readRequiredEnv(name: 'DATABASE_URL' | 'INTERNAL_AUTH_PUBLIC_KEY_B64') {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

export function getPort() {
  const rawPort = process.env.PORT?.trim()

  if (!rawPort) {
    return 3000
  }

  const port = Number(rawPort)

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port')
  }

  return port
}

export function getConfig() {
  return {
    databaseUrl: readRequiredEnv('DATABASE_URL'),
    internalAuthPublicKeyBase64: readRequiredEnv('INTERNAL_AUTH_PUBLIC_KEY_B64'),
    internalAuthAudience: 'business-service',
    internalAuthDevBypass: {
      enabled: process.env.NODE_ENV === 'development' && process.env.INTERNAL_AUTH_DEV_BYPASS === 'true',
      userId: process.env.INTERNAL_AUTH_DEV_USER_ID?.trim() || 'local-test-user',
      sessionId: 'local-test-session',
    },
    port: getPort(),
  }
}

export function validateRuntimeConfig() {
  getConfig()
}
