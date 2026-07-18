## Exploration: password-recovery

### Current State

**Auth Service (Better Auth)**  
- Configured in `apps/auth-service/src/auth.ts` with `emailAndPassword.enabled: true` and `resetPasswordTokenExpiresIn: 3600` (1 hour).
- `sendResetPassword` callback uses `sendPasswordResetEmail` from `apps/auth-service/src/email/auth-emails.ts`, which builds a URL pointing to Better Auth's built-in `/reset-password` endpoint (default Better Auth behavior) — **but no web page or mobile deep link currently handles this URL**.
- Email verification is implemented and working: email contains a link to `/verificar-correo` with token in URL hash; web page at `apps/web/app/verificar-correo/page.tsx` calls `POST /api/verificar-correo` which forwards the token to Better Auth `/verify-email`; on success the web page deep-links back to mobile via `oikentra://auth/verify?verified=1`.
- Google OAuth is configured for web, iOS, and Android (`socialProviders.google` in auth.ts, client IDs in config.ts). Users can sign up / sign in with Google **without setting a password**.

**Web App (Next.js)**  
- `apps/web/app/verificar-correo/page.tsx` → renders `EmailVerification` component.
- `apps/web/components/email-verification.tsx` reads token from `window.location.hash`, POSTs to `/api/verificar-correo`, on success shows "Abrir Oikentra" button with deep link `oikentra://auth/verify?verified=1`.
- `apps/web/app/api/verificar-correo/route.ts` validates origin, forwards token to Better Auth `/verify-email`, returns success/error codes.
- **No password reset page or API route exists yet**.

**Mobile App (Expo/React Native)**  
- Deep link scheme: `oikentra://` (configured in `apps/mobile/app.config.ts`).
- Auth layout at `apps/mobile/app/(auth)/_layout.tsx` handles deep links via `useLocalSearchParams` on the `verify` screen.
- `apps/mobile/app/(auth)/verify.tsx` handles `oikentra://auth/verify?token=...&email=...&verified=1&error=...`:
  - If `token` present → calls `authClient.verifyEmail({ query: { token } })`.
  - If `verified=1` → checks for active session, shows "Continuar" button to app or "Iniciar sesión".
  - Supports resending verification email with cooldown.
- Sign-in form (`apps/mobile/components/sign-in-form.tsx`) handles `EMAIL_NOT_VERIFIED` error by navigating to verify screen with email.
- **No "Forgot password" link or screen exists** in sign-in or sign-up flows.
- Auth client (`apps/mobile/lib/auth-client.ts`) exports `signIn`, `signUp`, `sendVerificationEmail`, `verifyEmail`, `getSession`, `signOut` — **no `resetPassword` or `sendResetPasswordEmail` exported**.

**Data Model (Drizzle/PostgreSQL)**  
- `user` table: `id`, `name`, `email` (unique), `emailVerified`, `image`, `createdAt`, `updatedAt`.
- `account` table: `providerId` (e.g., "google"), `password` (nullable — **Google-only accounts have `password = null`**), `userId` FK.
- `verification` table used for email verification tokens and **also for password reset tokens** (Better Auth uses the same table with `identifier = email`, `value = token`).

### Affected Areas

| Path | Why Affected |
|------|--------------|
| `apps/auth-service/src/auth.ts` | Better Auth config: `sendResetPassword` callback URL must point to web reset page (or mobile deep link); may need to adjust `resetPasswordTokenExpiresIn`. |
| `apps/auth-service/src/email/auth-emails.ts` | `sendPasswordResetEmail` currently receives Better Auth's default reset URL; must construct web reset page URL with token in hash (matching email verification pattern). |
| `apps/web/app/restablecer-contrasena/page.tsx` **(new)** | Web page for password reset (mirrors `verificar-correo` pattern). |
| `apps/web/components/password-reset.tsx` **(new)** | Client component: reads token from hash, POSTs to API, shows new password form on success, deep-links back to mobile. |
| `apps/web/app/api/restablecer-contrasena/route.ts` **(new)** | API route: validates origin, forwards token to Better Auth `/reset-password` (or calls `authClient.resetPassword`), returns success/error. |
| `apps/mobile/lib/auth-client.ts` | Export `sendResetPasswordEmail` and `resetPassword` from `authClient`. |
| `apps/mobile/components/sign-in-form.tsx` | Add "¿Olvidaste tu contraseña?" link → navigate to new "forgot password" screen. |
| `apps/mobile/app/(auth)/forgot-password.tsx` **(new)** | Screen: email input → calls `authClient.sendResetPasswordEmail({ email, callbackURL: "oikentra://auth/reset-password?verified=1&email=..." })`. |
| `apps/mobile/app/(auth)/reset-password.tsx` **(new)** | Screen: handles `oikentra://auth/reset-password?token=...&email=...&verified=1&error=...`; shows new password form or success state; deep-links to app on success. |
| `apps/mobile/app/(auth)/_layout.tsx` | Ensure deep link route for `reset-password` is recognized (Expo Router handles via file). |
| `apps/mobile/lib/validation/auth-schemas.ts` **(new/extend)** | Zod schemas for forgot password (email) and reset password (password, confirmPassword). |

### Approaches

#### 1. Web-Based Password Reset (Recommended — follows existing email verification pattern)

**Flow:**
1. User taps "Forgot password" on mobile sign-in → navigates to `/forgot-password` screen.
2. Enters email → mobile calls `authClient.sendResetPasswordEmail({ email, callbackURL: "oikentra://auth/reset-password?verified=1&email=..." })`.
3. Auth service sends email with link to web reset page: `https://web.oikentra.com/restablecer-contrasena#token=xyz`.
4. User opens link in browser (mobile or desktop) → web page reads token from hash, shows "New password" form.
5. On submit, web page POSTs to `/api/restablecer-contrasena` → forwards to Better Auth `/reset-password`.
6. On success, web page shows "Contraseña actualizada" + "Abrir Oikentra" button with deep link `oikentra://auth/reset-password?verified=1`.
7. Mobile app receives deep link, verifies session exists, navigates to app home or sign-in.

| Pros | Cons | Effort |
|------|------|--------|
| Consistent with existing email verification UX | Extra hop through web (slightly slower) | Medium |
| Works if user opens email on desktop | Requires web page + API route | |
| Web handles complex password validation UI | Two deep links (email→web, web→mobile) | |
| Single source of truth for reset logic (web) | | |

#### 2. Mobile-Native Password Reset

**Flow:**
1. Email contains deep link `oikentra://auth/reset-password?token=xyz`.
2. Mobile app opens directly to reset screen, reads token from query params.
3. User enters new password → mobile calls `authClient.resetPassword({ token, newPassword })`.
4. On success, navigates to app home or sign-in.

| Pros | Cons | Effort |
|------|------|--------|
| Faster (no web round-trip) | Fails if user opens email on desktop (no app installed) | Medium-High |
| Simpler mental model for mobile-only users | Must handle token in query params (not hash) — Better Auth sends token in URL, not hash | |
| Works offline-first after link opened | Password validation UI more complex in React Native | |
| | Google-only accounts: no password to reset → confusing UX | |

#### 3. Hybrid (Both Web and Mobile Deep Links)

Send **both** URLs in email (web as primary, mobile deep link as fallback via `callbackURL` param). Better Auth only supports one `callbackURL` per email, so this requires custom email template or two separate emails.

| Pros | Cons | Effort |
|------|------|--------|
| Maximum compatibility | Complex email template logic | High |
| User chooses platform | Two code paths to maintain | |
| | Better Auth limitation: single callbackURL | |

### Recommendation

**Approach 1: Web-Based Password Reset** — follow the exact same pattern as email verification.

**Rationale:**
- The codebase already has a working, tested pattern for email verification via web + deep link back to mobile. Reusing it minimizes new code, reduces bugs, and ensures consistent UX.
- Works universally: user can reset password from any device (mobile, desktop, tablet).
- Web page can reuse the `EmailVerification` component structure, adapting it for password input.
- Mobile app only needs a "Forgot password" screen that triggers the email; the heavy lifting (token validation, password form) stays on web.
- Google-only accounts: the "Forgot password" screen can detect if the account has no password (via `account.providerId === 'google' && account.password === null`) and show a message: "This account uses Google Sign-In. No password to reset. Sign in with Google instead."

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Google-only accounts have no password** | User requests reset → email sent → reset fails or confuses user | In "Forgot password" screen, check if account exists and has password; if Google-only, show "This account uses Google Sign-In" message and offer Google sign-in button. |
| **Expired or reused reset token** | Better Auth returns 400/404 → web page shows "Link expired, request new one" | Mirror email verification error handling: show error, offer "Resend link" button (calls `sendResetPasswordEmail` again). |
| **Already authenticated user clicks reset link** | Better Auth may auto-sign-in after reset (config: `autoSignInAfterVerification` not applicable to reset) | On web success, don't auto-sign-in; just show success + deep link. Mobile deep link handler checks session and navigates appropriately. |
| **Deep link not registered / app not installed** | Web "Abrir Oikentra" button does nothing | Web page also shows "Or sign in at oikentra.com" fallback link. Universal Links / App Links configured for production. |
| **Offline-first mobile: user requests reset offline** | `sendResetPasswordEmail` fails silently or throws | Show "No connection — try again when online" with retry button. Queue request when online (Expo `useNetworkState`). |
| **Token in URL hash vs query params** | Better Auth sends token in URL (not hash) by default; email verification uses hash | In `auth-emails.ts`, construct URL with `#token=` hash manually (as done for verification). Web page reads from `window.location.hash`. |
| **Rate limiting / abuse** | Attacker spams reset emails | Better Auth has built-in rate limiting (429 handled in web API). Mobile UI shows cooldown (mirror verify screen). |

### Edge Cases Addressed

1. **Google-only account** → Detect via `account.password === null` in "Forgot password" flow; show tailored message.
2. **Expired/reused link** → Web API returns `INVALID_OR_EXPIRED_TOKEN` → UI shows "Solicita un nuevo enlace".
3. **Authenticated user** → Mobile deep link handler checks `authClient.getSession()`; if session exists, navigate to app home.
4. **Deep link handling** → Expo Router file-based routing: `reset-password.tsx` receives `token`, `email`, `verified`, `error` params.
5. **Offline-first** → "Forgot password" screen checks `useNetworkState()`; disables submit with helpful message when offline.

### Ready for Proposal

**Yes.** The exploration is complete. The recommended approach (web-based reset following existing verification pattern) is well-understood, reuses existing patterns, and addresses all identified edge cases. The orchestrator should proceed to `sdd-propose` with this change name `password-recovery`.