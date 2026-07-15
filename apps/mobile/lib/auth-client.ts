import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_AUTH_BASE_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
] as const;

const OPTIONAL_ENV_VARS = [
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
] as const;

function readEnv(name: string): string | undefined {
  return (process.env as Record<string, string | undefined>)[name]?.trim();
}

function assertEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `[mobile-auth] Missing required environment variable: ${name}. ` +
        `The app cannot initialize the Better Auth client without it.`
    );
  }
  return value;
}

for (const name of REQUIRED_ENV_VARS) {
  assertEnv(name);
}

export const authBaseUrl = assertEnv('EXPO_PUBLIC_AUTH_BASE_URL');

export const googleWebClientId = assertEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
export const googleIosClientId = readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
export const googleAndroidClientId = readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    expoClient({
      scheme: 'oikentra',
      storagePrefix: 'oikentra',
      storage: SecureStore,
    }),
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession,
  sendVerificationEmail,
  verifyEmail,
} = authClient;
