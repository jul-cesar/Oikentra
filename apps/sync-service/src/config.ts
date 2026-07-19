function readRequiredEnv(name: 'INTERNAL_AUTH_PUBLIC_KEY_B64') {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`${name} is required`)
  return value
}

export function getConfig() {
  return {
    internalAuthPublicKeyBase64: readRequiredEnv('INTERNAL_AUTH_PUBLIC_KEY_B64'),
    internalAuthAudience: 'sync-service',
  }
}

export function validateRuntimeConfig() {
  getConfig()
}
