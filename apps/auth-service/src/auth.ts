import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'

import { getConfig } from './config/config'
import { getDb } from './db/client'
import { sendPasswordResetEmail, sendVerificationEmail } from './email/auth-emails'

function createAuth() {
  const config = getConfig()
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token, url }, request) => {
        const outcome = await sendPasswordResetEmail({
          to: user.email,
          userId: user.id,
          token,
          url,
          requestId: request?.headers.get('x-request-id') ?? crypto.randomUUID(),
        })

        if (outcome.status === 'provider_only') {
          throw APIError.from('BAD_REQUEST', {
            code: 'PASSWORD_RESET_NOT_AVAILABLE',
            message: 'Password reset is not available for this account.',
          })
        }
      },
    },
    emailVerification: {
      expiresIn: 3600,
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, token }) => {
        await sendVerificationEmail({
          to: user.email,
          token,
        })
      },
    },
    socialProviders: {
      google: {
        clientId: [
          config.googleClientId,
          config.googleIosClientId,
          config.googleAndroidClientId,
        ].filter((id): id is string => Boolean(id)),
        clientSecret: config.googleClientSecret,
      },
    },
    trustedOrigins: [
      config.betterAuthUrl,
      config.webUrl,
      'oikentra://',
      'oikentra://auth/verify',
      'oikentra://*',
      ...(process.env.NODE_ENV === 'development'
        ? ['exp://', 'exp://**', 'exp://192.168.*.*:*/**']
        : []),
    ],
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    ...(config.authCookieDomain
      ? {
          advanced: {
            crossSubDomainCookies: {
              enabled: true,
              domain: config.authCookieDomain,
            },
          },
        }
      : {}),
    plugins: [expo()],
  })
}

let auth: ReturnType<typeof createAuth> | undefined

export function getAuth() {
  return (auth ??= createAuth())
}
