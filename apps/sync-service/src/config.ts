function readRequiredEnv(name: 'INTERNAL_AUTH_PUBLIC_KEY_B64') {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`${name} is required`)
  return value
}

export function getConfig() {
  return {
    internalAuthPublicKeyBase64: readRequiredEnv('INTERNAL_AUTH_PUBLIC_KEY_B64'),
    internalAuthAudience: 'sync-service',
    internalAuthDevBypass: {
      enabled: process.env.NODE_ENV === 'development' && process.env.INTERNAL_AUTH_DEV_BYPASS === 'true',
      userId: process.env.INTERNAL_AUTH_DEV_USER_ID?.trim() || 'local-test-user',
      sessionId: 'local-test-session',
    },
  }
}

export function validateRuntimeConfig() {
  getConfig()
}
