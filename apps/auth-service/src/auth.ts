import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'

import { config } from './config/config'
import { db } from './db/client'
import { sendPasswordResetEmail, sendVerificationEmail } from './email/auth-emails'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
      })
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
  plugins: [expo()],
})
