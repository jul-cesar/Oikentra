const requiredEnvVars = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'RESEND_API_KEY',
  'AUTH_EMAIL_FROM',
  'WEB_URL',
  'INTERNAL_AUTH_PRIVATE_KEY_B64',
] as const

function readRequiredEnv(name: (typeof requiredEnvVars)[number]) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function readOptionalEnv(name: string) {
  return process.env[name]?.trim()
}

function readUrl(name: 'BETTER_AUTH_URL' | 'WEB_URL') {
  const value = readRequiredEnv(name)

  try {
    new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }

  return value
}

export function getConfig() {
  return {
    authEmailFrom: readRequiredEnv('AUTH_EMAIL_FROM'),
    betterAuthSecret: readRequiredEnv('BETTER_AUTH_SECRET'),
    betterAuthUrl: readUrl('BETTER_AUTH_URL'),
    databaseUrl: readRequiredEnv('DATABASE_URL'),
    internalAuthPrivateKeyBase64: readRequiredEnv('INTERNAL_AUTH_PRIVATE_KEY_B64'),
    internalAuthAudience: ['business-service', 'sync-service', 'reports-service'],
    googleClientId: readRequiredEnv('GOOGLE_CLIENT_ID'),
    googleClientSecret: readRequiredEnv('GOOGLE_CLIENT_SECRET'),
    googleIosClientId: readOptionalEnv('GOOGLE_IOS_CLIENT_ID'),
    googleAndroidClientId: readOptionalEnv('GOOGLE_ANDROID_CLIENT_ID'),
    resendApiKey: readRequiredEnv('RESEND_API_KEY'),
    webUrl: readUrl('WEB_URL'),
  }
}

export function validateRuntimeConfig() {
  getConfig()
}
