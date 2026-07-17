# Tasks: Password Recovery

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1300-1500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Resolve open questions: Google-only behavior, Better Auth revocation, Redis availability, CSRF convention | PR #1 (tracker branch) | Check if auth-service has revokeSessionsOnPasswordReset: true | Request recovery for Google-only account | Auth-service + web components (chain base: feature/tracker branch) |
| 2 | Implement auth-service requestPasswordReset wrapper with idempotency | PR #1 | Validate async requestPasswordReset | Send recovery for valid vs unknown email | Auth-service code files (PR #1 working tree) |
| 3 | Implement web recovery page: hash token extraction, password form, CORS validation | PR #1 | Open /restablecer-contrasena with token | Complete reset with valid/invalid token | Web page, API, component (PR #1 working tree) |
| 4 | Implement web API: token validation, password update, session revocation | PR #2 (PR #1 base) | POST /api/restablecer-contrasena with token | Successful reset with token validation | Web API route only (rollback removes PR #2 changes only) |
| 5 | Implement mobile recovery entry: email form, offline check, generic responses | PR #2 | Mobile forgot-password submit with valid/invalid email | Network flow with offline simulation | Mobile forgot-password screen (rollback removes PR #2 changes) |
| 6 | Implement mobile deep-link handler: success state, session validation, routing | PR #3 (PR #2 base) | Mobile reset-password with verified flag | Deep-link return with session verification | Mobile reset-password screen (rollback removes PR #3 changes) |

## Phase 1: Design Questions

- [x] 1.1 Research Better Auth `revokeSessionsOnPasswordReset` atomicity
- [x] 1.2 Validate Google-only account detection without enumeration  
- [x] 1.3 Confirm Redis availability and idempotency keys
- [x] 1.4 Confirm CSRF/origin convention in existing routes

## Phase 2: Infrastructure

- [ ] 2.1 Add typed auth wrapper utility in mobile client
- [ ] 2.2 Create request tracking with UUID and Redis idempotency keys
- [x] 2.3 Update Better Auth `revokeSessionsOnPasswordReset` config
- [x] 2.4 Add password-reset validation utilities

## Phase 3: Core Implementation

- [ ] 3.1 Implement mobile forgotten password screen with offline detection
- [ ] 3.2 Implement mobile reset-password deep-link handler
- [ ] 3.3 Implement auth-service requestPasswordReset wrapper with idempotency
- [x] 3.4 Implement web reset page with hash token and Zod validation
- [x] 3.5 Implement web API with CSRF/origin validation

## Phase 4: Testing

- [ ] 4.1 Manual verification of all RED scenarios from spec
- [x] 4.2 Typecheck TypeScript implementations
- [x] 4.3 Lint modified files (auth-service, web, mobile)
- [x] 4.4 Build affected packages successfully

## Phase 5: Documentation

- [x] 5.1 Update design with resolved open questions
- [ ] 5.2 Remove temporary validation code
- [ ] 5.3 Create integration summary