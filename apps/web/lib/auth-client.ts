import { createAuthClient } from "better-auth/react";

function resolveAuthBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Keep static generation independent from deployment-only runtime env vars.
  // Browser requests resolve against the current origin when the public URL is
  // not available in the client bundle.
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
