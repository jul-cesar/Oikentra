# Tasks: Web Auth with React Hook Form, Zod, and shadcn

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2,300-2,500 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main|feature-branch-chain|size-exception|pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Convert login-form to RHF/Zod/shadcn | PR 1 | `npm test login-form.unit` | POST /api/auth/sign-in with valid credentials | Remove login-form component (auth API remains) |
| 2 | Implement signup-form with validation | PR 2 | `npm test signup-form.unit` | POST /api/auth/sign-up with valid data | Remove signup-form (auth API remains) |
| 3 | Add forgot-password-form with reset flow | PR 3 | `npm test forgot-password.unit` | POST /api/auth/forgot-password then reset | Disable reset functionality (keep components) |
| 4 | Add Google OAuth integration | PR 4 | `npm test oauth.integration` | Sign in with Google popup | Disable OAuth (keep auth config) |
| 5 | Add protected dashboard route | PR 5 | `npm test dashboard.protected` | Access /dashboard as guest | Remove dashboard (keep route guards) |
| 6 | Mobile theme and Geologica assets | PR 6 | Manual visual verification | Check theme.css and fonts.css | Revert theme changes |

## Work Unit 2: Auth Forms

- [x] 2.1 Create `apps/web/components/sign-up-form.tsx`, `apps/web/app/registro/page.tsx`.
- [x] 2.2 Adapt `apps/web/components/email-verification.tsx` to Better Auth verify/resend with cooldown.
- [x] 2.3 Update `apps/web/app/verificar-correo/page.tsx` to forward token from hash/query.
- [x] 2.4 Create `apps/web/components/forgot-password-form.tsx`, `apps/web/app/recuperar-contrasena/page.tsx`.
- [x] 2.5 Create `apps/web/components/reset-password-form.tsx`, `apps/web/app/restablecer-contrasena/page.tsx`.

## Phase 1: Foundation / Infrastructure

- [ ] 1.1 Convert `apps/web/components/login-form.tsx` to use React Hook Form + Zod + shadcn Form with proper validation
- [ ] 1.2 Create `apps/web/lib/auth/` directory with auth configuration
- [ ] 1.3 Create `apps/web/components/forms/` directory for new form components
- [ ] 1.4 Add `React Hook Form`, `Zod`, and appropriate dev dependencies
- [ ] 1.5 Create `apps/web/lib/validation/` directory for Zod schemas

## Phase 2: Core Implementation

- [ ] 2.1 Create `apps/web/components/signup-form.tsx` with RHF/Zod/shadcn
- [ ] 2.2 Create `apps/web/components/forgot-password-form.tsx`
- [ ] 2.3 Create `apps/web/components/reset-password-form.tsx`
- [ ] 2.4 Implement `apps/web/app/(auth)/signup/` page using signup-form
- [ ] 2.5 Implement `apps/web/app/(auth)/forgot-password/` page using forgot-password-form
- [ ] 2.6 Implement `apps/web/app/(auth)/reset-password/` page using reset-password-form
- [ ] 2.7 Create `apps/web/hooks/use-auth.ts` for session management
- [ ] 2.8 Create `apps/web/hooks/use-forms.ts` for form utilities
- [ ] 2.9 Create `apps/web/hooks/use-oauth.ts` for Google OAuth integration

## Phase 3: Integration / Wiring

- [x] 3.1 Create `apps/web/hooks/use-session.ts` for session management
- [x] 3.2 Implement `apps/web/app/dashboard/` route with protective guard
- [ ] 3.3 Add auth routes: `apps/web/app/api/auth/` with all endpoints
- [ ] 3.4 Update `apps/web/lib/utils.ts` if needed for auth utilities
- [ ] 3.5 Create `apps/web/components/dashboard.tsx` protected component
- [ ] 3.6 Implement session hydration in `apps/web/lib/auth/session.ts`

## Phase 4: Testing / Verification

- [ ] 4.1 Write unit tests for all Zod validation schemas
- [ ] 4.2 Create integration tests for authentication flows
- [ ] 4.3 Write E2E tests for user journey scenarios
- [ ] 4.4 Create security tests for authentication bypass attempts
- [ ] 4.5 Test mobile theme and Geologica font compatibility
- [ ] 4.6 Write tests for OAuth flow and session management

## Phase 5: Cleanup / Documentation

- [ ] 5.1 Update existing `apps/web/components/email-verification.tsx` to match patterns
- [ ] 5.2 Create comprehensive README for auth system
- [ ] 5.3 Remove temporary test files and code
- [ ] 5.4 Update project documentation with new architecture
- [ ] 5.5 Clean up unused imports and code

## Implementation Order

Implementation flows sequentially: Phase 1 provides the foundation, Phase 2 delivers the core authentication forms, Phase 3 connects everything with routes and guards, Phase 4 validates functionality, and Phase 5 finalizes and documents everything. No phase depends on a later phase, ensuring stable dependencies.