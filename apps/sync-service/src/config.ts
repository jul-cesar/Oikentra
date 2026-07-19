function readRequiredEnv(name: 'INTERNAL_AUTH_PUBLIC_KEY_B64') {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`${name} is required`)
  return value
}

export const config = {
  internalAuthPublicKeyBase64: readRequiredEnv('INTERNAL_AUTH_PUBLIC_KEY_B64'),
  internalAuthAudience: 'sync-service',
}
