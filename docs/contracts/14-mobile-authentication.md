# 14 - Mobile Authentication

## 1. Purpose

This document describes the mobile authentication flow for the Oikentra Expo application using Better Auth. It covers the Expo client setup, email/password authentication, native Google Sign-In, deep-link callback routing, session protection, and the external configuration required to ship to production.

## 2. Technology Choices

- **Better Auth Expo client** (`@better-auth/expo`) is the only session authority on the device.
- **SecureStore** persists sessions and cookies.
- **No additional state libraries** such as TanStack Query or Zustand are used for auth; `useSession` from Better Auth is sufficient.
- **Native Google Sign-In** uses `@react-native-google-signin/google-signin` and forwards the ID token to Better Auth.
- **Deep-link scheme** `oikentra://` routes email verification callbacks back into the app.

## 3. Environment Variables

Create `apps/mobile/.env` from `apps/mobile/.env.example`:

```bash
EXPO_PUBLIC_AUTH_BASE_URL=https://api.oikentra.com/api/auth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

Rules:

- `EXPO_PUBLIC_AUTH_BASE_URL` is required and must be the production auth origin.
- Missing required variables throw a named startup error; the app never falls back to a different server.
- Client IDs are public. The Google client secret lives only in `apps/auth-service`.

## 4. Auth Client

The client is created in `apps/mobile/lib/auth-client.ts`:

```ts
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL,
  plugins: [
    expoClient({
      scheme: 'oikentra',
      storagePrefix: 'oikentra',
      storage: SecureStore,
    }),
  ],
});
```

## 5. Email/Password Authentication

- `app/(auth)/sign-in.tsx` renders `SignInForm` and calls `authClient.signIn.email`.
- `app/(auth)/sign-up.tsx` renders `SignUpForm`, collects name, email, and password, and calls `authClient.signUp.email` with `callbackURL: 'oikentra://auth/verify'`.
- The server sends the verification email. After the user taps the link, the app is opened on `oikentra://auth/verify?token=...`.
- `app/(auth)/verify.tsx` calls `authClient.verifyEmail({ query: { token } })` and refreshes the session with `authClient.getSession()`.

## 6. Native Google Sign-In

The flow is implemented in `apps/mobile/lib/google-auth.ts` and `apps/mobile/components/social-connections.tsx`:

1. Configure `GoogleSignin` with the web, iOS, and Android client IDs.
2. Call `GoogleSignin.signIn()` to obtain an ID token.
3. Exchange the ID token with Better Auth:

```ts
await authClient.signIn.social({
  provider: 'google',
  idToken: { token: idToken },
});
```

Cancelled flows and misconfiguration surface recoverable errors without exposing secrets.

## 7. Deep Links and Callback Routing

The app scheme is `oikentra://`.

Supported callback path:

```txt
oikentra://auth/verify
```

Unknown or malformed paths are rejected in `app/_layout.tsx`. The listener is deduplicated by navigation; invalid callbacks never authenticate a user or alter session state.

## 8. Route Protection

- `app/_layout.tsx` is a loading-aware session gate.
- Authenticated users inside `app/(auth)/` are redirected to `app/(app)/`.
- Unauthenticated users outside `app/(auth)/` are redirected to `app/(auth)/sign-in`.
- `app/(app)/_layout.tsx` blocks direct access when there is no active session.
- `app/(app)/index.tsx` displays the current session user and a sign-out action. Sign-out calls `authClient.signOut()` and clears local persistence.

## 9. Auth-Service Compatibility

The following changes keep the mobile client compatible with the existing auth-service contract:

- `apps/auth-service/src/config/config.ts` now reads optional `GOOGLE_IOS_CLIENT_ID` and `GOOGLE_ANDROID_CLIENT_ID`.
- `apps/auth-service/src/auth.ts` passes an array of Google client IDs to Better Auth so it accepts ID tokens from web, iOS, and Android clients.
- `apps/auth-service/src/auth.ts` enables the official Better Auth Expo server plugin with `plugins: [expo()]`.
- `trustedOrigins` explicitly includes `oikentra://auth/verify`, the `oikentra://` app scheme, the existing `oikentra://*` callback pattern, and development `exp://` origins.

## 10. Security Boundaries

- No passwords or Google client secrets are stored in the mobile bundle.
- Mobile Google client IDs are public configuration values. The Google OAuth client secret is server-only and must remain in `apps/auth-service`.
- Session data is stored in `expo-secure-store`.
- The server is the only place that holds the Google client secret.
- Malformed deep links are ignored.
- The auth base URL is validated at startup.

## 11. External Setup Required

The following cannot be completed in code and must be configured in Google Cloud Console and deployment tooling:

1. Create a Google Cloud OAuth 2.0 client for **Web application** and note the client ID. Add the client secret to `apps/auth-service` as `GOOGLE_CLIENT_SECRET`.
2. Create separate OAuth clients for **iOS** and **Android** using the bundle/package identifier `com.oikentra.app`.
3. Add the three client IDs to:
   - `apps/mobile/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
   - `apps/auth-service/.env` as `GOOGLE_CLIENT_ID` (web), `GOOGLE_IOS_CLIENT_ID`, and `GOOGLE_ANDROID_CLIENT_ID`.
4. In Google Cloud Console, add `https://api.oikentra.com/api/auth` as an authorized redirect domain for the web client if required.
5. For iOS, `app.config.ts` derives the reversed iOS client ID from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` for the Google Sign-In Expo plugin.
6. The auth-service deployment must expose `/api/auth/*` with HTTPS and CORS enabled for mobile origins.
7. Email verification emails from Better Auth must point to the production auth origin.
8. A native Google Sign-In `DEVELOPER_ERROR` is separate from email callback validation. Verify the Google Cloud iOS/Android OAuth clients, the `com.oikentra.app` bundle/package identifier, the Android signing certificate SHA-1/SHA-256 values, and the client IDs used by the native build. Do not put the server-only client secret in the mobile app.

## 12. Excluded Features

The following are intentionally not implemented in this change:

- Password recovery.
- Multi-factor authentication (MFA).
- Offline authenticated access.
- Web Google Sign-In browser flow (native only).

## 13. Testing

There is no test runner configured in `apps/mobile`. Verification is done through TypeScript type-checking and runtime testing in iOS/Android development builds. Expo Go is not sufficient for native Google Sign-In validation.
