import { createAuthClient } from 'better-auth/react';
import { expoClient, getSetCookie } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_AUTH_BASE_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
] as const;

const OPTIONAL_ENV_VARS = [
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
] as const;

const AUTH_STORAGE_PREFIX = 'oikentra';
const AUTH_COOKIE_STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_cookie`;

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
  baseURL: authBaseUrl.replace(/\/$/, ''),
  plugins: [
    expoClient({
      scheme: 'oikentra',
      storagePrefix: AUTH_STORAGE_PREFIX,
      storage: SecureStore,
    }),
  ],
});

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createAuthRequestOptions() {
  return {
    headers: {
      'X-Request-Id': createRequestId(),
    },
  };
}

export function getSafeAuthErrorMessage(
  error: { code?: string } | null | undefined,
  fallback = 'Ocurrió un problema inesperado. Intenta nuevamente.'
) {
  switch (error?.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'USER_NOT_FOUND':
      return 'El correo o la contraseña no son correctos.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirma tu correo para continuar.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
    case 'EMAIL_ALREADY_EXISTS':
      return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.';
    case 'PASSWORD_TOO_SHORT':
      return 'La contraseña debe tener al menos 8 caracteres.';
    case 'SOCIAL_PROVIDER_ERROR':
      return 'No pudimos iniciar sesión con Google. Intenta nuevamente.';
    default:
      return fallback;
  }
}

export async function persistAuthCookie(setCookieHeader: string): Promise<void> {
  const currentCookie = SecureStore.getItem(AUTH_COOKIE_STORAGE_KEY) ?? undefined;
  const nextCookie = getSetCookie(setCookieHeader, currentCookie);
  await SecureStore.setItemAsync(AUTH_COOKIE_STORAGE_KEY, nextCookie);
}

export function getAuthCookie(): string | undefined {
  return SecureStore.getItem(AUTH_COOKIE_STORAGE_KEY) ?? undefined;
}

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession,
  sendVerificationEmail,
  verifyEmail,
} = authClient;
