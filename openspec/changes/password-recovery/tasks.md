# Tasks: Password Recovery (Revised)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Reconcile unmerged staged web reset page without overwriting existing work; establish canonical web proxy flow preserving user web auth work | PR 1 | Open /restablecer-contrasena with existing direct-client tokens | Verify web reset flow still works with current web auth flows | Existing web staging files: apps/web/components/reset-password-form.tsx, apps/web/components/password-reset.tsx, apps/web/app/api/restablecer-contrasena/route.ts |
| 2 | Implement mobile forgot-password and native reset/deep-link flow; including mobile auth-client exports and sign-in navigation | PR 2 | Deep-link mobile reset-password with token param; calls authClient.resetPassword | Test mobile deep-link routing and form submission | Mobile screens: apps/mobile/app/(auth)/reset-password.tsx, libs auth-client exports |
| 3 | Finalize auth-service dual-link email/trusted origin/session policy; clean up/archive the dead duplicate web reset form only after ownership review; run full verification | PR 3 | Configure auth-service dual-link email with hash for web, query for mobile; trustedOrigin for oikentra://auth/reset-password | Verify email generation respects provider-only and generic responses; run typecheck and build for all packages | Auth-service: apps/auth-service/src/auth.ts, src/email/auth-emails.ts; reset-password-form.tsx deletion after ownership review |

## Phase 1: Foundation (180 lines)

- [x] 1.1 Archimate web-to-proxy transition: read token from existing hash or direct redirect
- [x] 1.2 Validate existing staged web reset page as core authority; preserve its token handling
- [ ] 1.3 Map mobile deep-link URL pattern: `oikentra://auth/reset-password?token=...`
- [x] 1.4 Define shared password policy: 8-128 chars matching; client validation aligned with auth-service
- [ ] 1.5 Map dual-link email contract: web `#token=` hash; mobile `?token=` query
- [ ] 1.6 Define trusted origin: `oikentra://auth/reset-password` in auth-service trustedOrigins
- [ ] 1.7 Define rollback for mobile screens: delete new mobile screens if mismatched
- [x] 1.8 Define rollback for web routes/proxy: remove new web routes/API if mismatched

## Phase 2: Reconciliation (280 lines)

- [x] 2.1 Reconcile unmerged web reset page: ensure reset-password-form.tsx is not rendered; redirect to canonical flow
- [x] 2.2 Extract canonical reset token and newPassword validation from existing reset-password-form.tsx into shared utilities
- [x] 2.3 Implement web-to-proxy flow: existing password-reset component extracts hash token; prevents caching/conflicts
- [x] 2.4 Update web proxy API: validate origin, extract token from hash or query, forward to auth-service resetPassword
- [ ] 2.5 Update auth-service dual-link: email callback constructs hash for web, query param for mobile; never log token
- [ ] 2.6 Implement provider-only and generic response handling: Google-only accounts receive explanation; unknown emails generic response
- [x] 2.7 Integrate shared password/session policy: enforce 8-128 chars, guarantee session revocation via revokeSessionsOnPasswordReset

## Phase 3: Implementation (280 lines)

- [ ] 3.1 Implement mobile deep-link handler: parse token from query, validate offline-first, call authClient.resetPassword
- [ ] 3.2 Implement mobile recovery entry: email form with offline detection and generic responses
- [x] 3.3 Implement web reset API: origin validation, token extraction, password validation, auth-service forwarding
- [ ] 3.4 Update mobile auth-client with resetPassword export; update sign-in-form navigation links
- [ ] 3.5 Final verification: typecheck, build, lint for all packages; delete reset-password-form.tsx after ownership review

## Dependencies

- Better Auth v1.6.23 with `requestPasswordReset`, `resetPassword`, `revokeSessionsOnPasswordReset=true`
- `oikentra://auth/reset-password` trusted origin
- Mobile auth-client updated with `resetPassword` and `revokeSessionsOnPasswordReset=true`
- Shared validation schemas across web and mobile for password policy (8-128 chars)

## Affected Paths

**Core Files:**
- `apps/auth-service/src/auth.ts` (trusted origin)
- `web` and `mobile` packages with shared password validation
- `auth-service/src/auth.ts` (trusted origin, dual-link email)
- `email/auth-emails.ts` (link construction)
- `web/api/reset-password` (proxy flow)
- `mobile/app/(auth)/reset-password` (native reset)

**Rollback Boundaries:**
- PR 1: Existing web staging files; revert resets to current web state if mismatches
- PR 2: Web proxy API changes; remove new `/api/reset-password` if incongruent
- PR 3: Mobile screens and auth-service dual-link; revert mobile screens and email contract
