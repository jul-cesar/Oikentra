import { createAuthClient } from "better-auth/react";

function readEnv(name: string): string | undefined {
  return (typeof process !== "undefined" ? process.env[name] : undefined)?.trim();
}

function resolveAuthBaseUrl(): string {
  const envUrl = readEnv("NEXT_PUBLIC_BETTER_AUTH_URL");
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (readEnv("NODE_ENV") === "production") {
    throw new Error(
      "[web-auth] Missing NEXT_PUBLIC_BETTER_AUTH_URL. Set it before a production build."
    );
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
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
