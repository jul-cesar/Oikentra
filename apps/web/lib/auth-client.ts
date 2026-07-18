import { createAuthClient } from "better-auth/react";

const DEFAULT_AUTH_BASE_URL = "https://api.oikentra.com/api/auth";

function resolveAuthBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.trim() || DEFAULT_AUTH_BASE_URL;

  return value.replace(/\/$/, "");
}

export const authBaseUrl = resolveAuthBaseUrl();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession,
  sendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} = authClient;

export function getSafeAuthErrorMessage(
  error: { code?: string } | null | undefined,
  fallback = "Ocurrió un problema inesperado. Intenta nuevamente.",
): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "USER_NOT_FOUND":
      return "El correo o la contraseña no son correctos."
    case "EMAIL_NOT_VERIFIED":
      return "Confirma tu correo para continuar."
    case "USER_ALREADY_EXISTS":
    case "EMAIL_ALREADY_EXISTS":
      return "Ya existe una cuenta con ese correo."
    case "PASSWORD_TOO_SHORT":
      return "La contraseña debe tener al menos 8 caracteres."
    case "SOCIAL_PROVIDER_ERROR":
      return "No pudimos iniciar sesión con Google. Intenta nuevamente."
    default:
      return fallback
  }
}

export function getSafeRedirectPath(
  redirectTo: string | null | undefined,
  fallback = "/",
): string {
  if (!redirectTo) {
    return fallback;
  }

  const trimmed = redirectTo.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  return fallback;
}

export function getSafeRedirectUrl(
  redirectTo: string | null | undefined,
  fallback = "/",
): string {
  const path = getSafeRedirectPath(redirectTo, fallback);
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}
