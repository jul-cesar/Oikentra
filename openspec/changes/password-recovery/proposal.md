# Proposal: Password Recovery (Revised)

## Intent

Add first-class password reset on web and mobile: forgot entry, email token, password form, session revocation. Auth-service is the sole authority. Web and mobile are symmetric clients with platform-appropriate reset paths.

## Scope

| In | Out |
|----|-----|
| Web forget + reset pages, mobile forget + reset screens, auth-service email with web+deep-link, Google-only check, session revocation, offline-aware mobile | SMS/WhatsApp, admin-initiated, remembered-device, Redis idempotency |

## Capabilities

### New
- `password-recovery`: Full recovery flow — web+mobile forgot entry, auth-service email contract, web proxy reset API, mobile native reset form, session revocation, deep-link return.

### Modified
None (`openspec/specs/` empty).

## Approach

**Forgot (both)**: `authClient.requestPasswordReset()` → auth-service. Callback checks Google-only (`account.password` for credential provider), constructs dual-link email (web `#token=` + mobile `?token=`), logs outcome. Generic response.

**Web reset**: `password-reset.tsx` → `POST /api/restablecer-contrasena` proxy → origin + token + password validation → auth-service `resetPassword` → `revokeSessionsOnPasswordReset` → success + deep-link + web fallback.

**Mobile reset** (native form — new): Deep link (`?token=`) → native form → `authClient.resetPassword()` to auth-service → session check → home/sign-in.

**One path per platform**: Web uses proxy (origin security). Mobile uses direct client (origin irrelevant). Staged `reset-password-form.tsx` (direct-client for web) is archived. Staged `forgot-password-form.tsx` stays — callback owns the logic.

## Affected Areas

`apps/auth-service/src/auth.ts` (staged), `apps/auth-service/src/email/auth-emails.ts` (staged — dual-link), `apps/web/app/recuperar-contrasena/` (staged), `apps/web/app/restablecer-contrasena/` (staged), `apps/web/components/password-reset.tsx` (staged), `apps/web/lib/validation/auth-schemas.ts` (staged), `apps/web/lib/auth-client.ts` (staged), `apps/mobile/app/(auth)/forgot-password.tsx` (new), `apps/mobile/app/(auth)/reset-password.tsx` (new), `apps/mobile/lib/auth-client.ts` (modified — add exports), `apps/mobile/components/sign-in-form.tsx` (modified — add link), `apps/auth-service/src/auth.ts trustedOrigins` (modified — add reset deep-link).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Two reset paths diverge | Med | Auth-service enforces policy; proxy is validation only |
| Hash vs query token | Low | Hash prevents server log leaks; query is standard for OS intents |

## Rollback Plan

1. Remove mobile screens. 2. Remove web routes + components. 3. Revert email to single URL. 4. Deploy auth-service → web → mobile (forward); reverse for rollback.

## Dependencies

Better Auth `requestPasswordReset` / `resetPassword` v1.6.23, `revokeSessionsOnPasswordReset: true` (staged), `oikentra://auth/reset-password` trusted origin (needs addition), mobile `better-auth/expo` + `SecureStore`.

## Success Criteria

- [ ] Web forgot → email → web reset → deep-link or web sign-in
- [ ] Mobile forgot → email → mobile native reset → home/sign-in
- [ ] Mobile forgot → email → web reset (browser) → deep-link back → mobile home/sign-in
- [ ] Google-only: explanation, never a reset form
- [ ] Unknown emails: generic response, no enumeration
- [ ] All sessions revoked after password change
- [ ] Offline: "No connection" with retry
