const requiredEnvVars = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'RESEND_API_KEY',
  'AUTH_EMAIL_FROM',
  'WEB_URL',
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

const betterAuthUrl = readRequiredEnv('BETTER_AUTH_URL')
const webUrl = readRequiredEnv('WEB_URL')

try {
  new URL(betterAuthUrl)
} catch {
  throw new Error('BETTER_AUTH_URL must be a valid URL')
}

try {
  new URL(webUrl)
} catch {
  throw new Error('WEB_URL must be a valid URL')
}

export const config = {
  authEmailFrom: readRequiredEnv('AUTH_EMAIL_FROM'),
  betterAuthSecret: readRequiredEnv('BETTER_AUTH_SECRET'),
  betterAuthUrl,
  googleClientId: readRequiredEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: readRequiredEnv('GOOGLE_CLIENT_SECRET'),
  googleIosClientId: readOptionalEnv('GOOGLE_IOS_CLIENT_ID'),
  googleAndroidClientId: readOptionalEnv('GOOGLE_ANDROID_CLIENT_ID'),
  resendApiKey: readRequiredEnv('RESEND_API_KEY'),
  webUrl,
}
