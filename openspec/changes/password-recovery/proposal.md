# Proposal: Password Recovery

## Intent

Users who forget their password have no recovery path. Add a web-based reset flow reusing the existing email-verification pattern (web page + deep-link return) with mandatory session revocation on change.

## Scope

### In Scope
- Mobile "Forgot password" screen → triggers reset email via Better Auth
- Web reset page (`/restablecer-contrasena`) + API route
- Auth-service email template → web URL with `#token=` hash
- Mobile deep-link return handler (success state only — no password form)
- Session revocation on password change (all devices)
- Google-only detection → explanation + Google sign-in (no silent password creation)
- Unknown-email generic response (prevents enumeration)
- Offline-aware: mobile checks network before sending request

### Out of Scope
- Native mobile password form (web is source of truth — resolves exploration overreach)
- SMS/WhatsApp reset delivery
- Admin-initiated password reset
- Remembered-device skip

## Capabilities

> Contract: `sdd-spec` reads this to determine spec files to create.

### New Capabilities
- `password-recovery`: Full recovery flow — mobile request entry, web reset page/API, auth-service email contract, secure update + session revocation, deep-link return, validation/error states.

### Modified Capabilities
None (`openspec/specs/` is empty — no existing specs).

## Approach

Web-based reset matching email verification pattern:

1. **Mobile** `forgot-password.tsx`: email input → `authClient.sendResetPasswordEmail({ email, callbackURL: "oikentra://auth/reset-password?verified=1&email=..." })`. Unknown emails → generic "If the account exists, you'll receive an email."
2. **Auth service** `auth-emails.ts`: construct URL `https://oikentra.com/restablecer-contrasena#token=...`
3. **Web** `restablecer-contrasena/page.tsx`: read token from `window.location.hash`, show new-password form (Zod validation, min 8 chars, confirm)
4. **Web API** `api/restablecer-contrasena/route.ts`: POST token + password → Better Auth `/reset-password`. On success, Better Auth revokes all user sessions.
5. **Web success**: "Contraseña actualizada" + "Abrir Oikentra" deep-link (`oikentra://auth/reset-password?verified=1`) + "Sign in at oikentra.com" fallback
6. **Mobile** `reset-password.tsx`: receives deep link, checks `authClient.getSession()`, navigates to app home or sign-in

**Google-only**: detect `account.password === null` before sending email → show "This account uses Google Sign-In. No password to reset." + Google sign-in button.

## Affected Areas

| Area | Impact | Detail |
|------|--------|--------|
| `apps/auth-service/src/auth.ts` | Modified | `sendResetPassword` URL target |
| `apps/auth-service/src/email/auth-emails.ts` | Modified | `#token=` hash URL build |
| `apps/web/app/restablecer-contrasena/page.tsx` | New | Reset page |
| `apps/web/components/password-reset.tsx` | New | Client component |
| `apps/web/app/api/restablecer-contrasena/route.ts` | New | API route |
| `apps/mobile/lib/auth-client.ts` | Modified | Export `sendResetPasswordEmail`, `resetPassword` |
| `apps/mobile/components/sign-in-form.tsx` | Modified | "Forgot password?" nav link |
| `apps/mobile/app/(auth)/forgot-password.tsx` | New | Email input + network check |
| `apps/mobile/app/(auth)/reset-password.tsx` | New | Deep-link handler (scoped: no password form) |
| `apps/mobile/lib/validation/auth-schemas.ts` | Modified | Forgot/reset Zod schemas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Google-only account confusion | Med | Detect pre-send; explanation + Google sign-in |
| Token in URL hash vs query | Med | Construct `#token=` manually in email template |
| Session revocation API gap | Low | Verify Better Auth `revokeSessions`; log failures |
| Desktop deep-link dead end | Low | Web success shows web fallback link |

## Rollback Plan

1. Revert `sendResetPassword` callback URL to Better Auth default
2. Delete web page, component, API route, mobile screens, schemas
3. Revert `auth-client.ts` exports and `sign-in-form.tsx`
4. Deploy auth-service first, then web, then mobile

## Dependencies

- Better Auth `resetPassword` plugin endpoint
- Better Auth session revocation API (`revokeSessions` or equivalent)
- `oikentra://auth/reset-password` Trusted Origin in `auth.ts`

## Success Criteria

- [ ] End-to-end password reset completes (mobile → email → web → deep-link back)
- [ ] Google-only users see explanation, never a reset form
- [ ] Unknown emails get generic response (no account enumeration)
- [ ] All sessions revoked after password change (old tokens rejected)
- [ ] Web → mobile deep link works on iOS and Android
- [ ] Offline state shows "No connection" with retry, no silent failure
