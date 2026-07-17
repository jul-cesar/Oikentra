# Design: Password Recovery

## Technical Approach

Keep Better Auth in `auth-service` as the sole owner of accounts, reset tokens, hashes, sessions, expiry, and rate limits. Mobile only requests recovery and consumes a success deep link; the web is the only password-entry surface. A thin web API validates same-origin requests and forwards the exact Better Auth reset contract. This follows the existing web verification proxy and Expo SecureStore client patterns.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Reset authority | Better Auth `requestPasswordReset` / `resetPassword` | Web-issued tokens, direct DB access | Version 1.6.23 owns opaque single-use tokens, expiry, hashing and generic unknown-email behavior. |
| Session revocation | `revokeSessionsOnPasswordReset: true` | Web-side session deletion, best-effort callback | The documented option is atomic to Better Auth’s reset operation; failure is surfaced as unsuccessful. |
| Mobile UX | Request screen + `oikentra://auth/reset-password?verified=1` handler | Native password form | Preserves web source of truth and avoids storing password input in the app. |
| Idempotency | Auth-service wrapper with Redis key `(operation,email-hash,key)` and short TTL | Passing `X-Idempotency-Key` to Better Auth | Better Auth’s documented endpoint has no idempotency contract; the wrapper can prevent duplicate sends while preserving service ownership. |

**Ownership**: auth-service owns user/account/provider rows, verification/reset records, password hashes, sessions and abuse counters. Web owns presentation, hash extraction, CSRF/origin validation and no persistent auth data. Mobile owns only form/navigation state and SecureStore session state. Email provider owns delivery status; it never receives a password or plaintext token in logs.

## End-to-End Flow

```text
Mobile request --POST /api/recovery/request + X-Request-Id/Idempotency-Key--> auth-service
  auth-service -> Better Auth requestPasswordReset -> email provider
  email -> https://oikentra.com/restablecer-contrasena#token=<opaque>
  Web hash -> POST /api/restablecer-contrasena {token,newPassword}
       (Origin/CSRF) -> auth-service Better Auth resetPassword
       (password hash + revoke all sessions) -> Web success
  Web -> oikentra://auth/reset-password?verified=1 -> Mobile getSession -> home or sign-in
```

## Interfaces / Contracts

* Mobile request: `POST https://api.oikentra.com/api/recovery/request`, JSON `{ email }`, headers `X-Request-Id: UUID`, `X-Idempotency-Key: UUID`; response always `202 {status:"accepted",requestId}` for syntactically valid email, including unknown/provider-only accounts. Offline sends nothing and retains input.
* Auth-service delegates to documented Better Auth `auth.api.requestPasswordReset({body:{email,redirectTo},headers})`; `sendResetPassword({user,url,token})` rewrites the URL to approved web origin with `#token=<token>` (never log token). The custom wrapper must preserve timing and generic output.
* Web reset: `POST /api/restablecer-contrasena`, same-origin `Origin` (proxy-aware `x-forwarded-proto/host` as existing route), CSRF token if the web CSRF convention is introduced; JSON `{token,newPassword}`. It forwards `auth.api.resetPassword({body:{token,newPassword},headers:{"X-Request-Id":...}})`. Success `200 {success:true,requestId}`; invalid/expired/used `400 {code:"INVALID_OR_EXPIRED_TOKEN",requestId}`; abuse `429`; dependency `503`. `Cache-Control: no-store`.
* Password policy: Better Auth `minPasswordLength: 8` (documented default max 128); web Zod requires matching fields and 8–128 characters. Hashing remains Better Auth’s implementation; token is accepted only from the browser hash and never query/referrer/logs.

Google-only handling is unresolved: Better Auth’s reset implementation creates a credential account when none exists, while its public request contract intentionally returns a generic result. No supported unauthenticated account lookup can safely distinguish Google-only from unknown email. Tasks must choose either a privacy-preserving authenticated/provider-specific flow or revise the “explanation before email” requirement; do not add a leaking lookup.

## Failure, Observability, and Rollout

Generate/validate UUID request IDs using the repository pattern and propagate `X-Request-Id` through web → auth-service → email logs. Log only outcome category (`accepted`, `delivery_failed`, `invalid_token`, `abuse_limited`, `provider_only`, `dependency_failed`) and hashed/omitted email; never passwords or tokens. Email failure means no success claim. Password persistence plus unconfirmed revocation is a failed operation and must alert with request ID; verify Better Auth transactional behavior before implementation—rollback cannot safely restore a consumed token, so recovery is manual/retry with a new request.

Deploy auth-service configuration/API first, then web, then mobile. Migration is configuration-only unless Redis idempotency storage requires provisioning. Rollback: disable mobile entry/deep-link, remove web routes, then revert auth email target; retain Better Auth schema. Feature-flag the mobile link during rollout.

## Testing Strategy

No runner exists; add typecheck plus manual iOS/Android and web integration checks. RED cases for tasks: origin mismatch, malformed/expired/replayed token, 8/128 boundary, generic unknown email, duplicate idempotency key, rate limit, email/auth outage, revocation failure, deep link with extra token (ignored), offline retry. Threat matrix: documentation-like paths N/A; Git repository selection N/A; commit state N/A; push state N/A; PR commands N/A (routing applies, but none of those execution boundaries do).

## Open Questions

- [x] Resolve Google-only behavior without enumeration and verify Better Auth revocation failure semantics.
  - **Resolution**: `sendResetPassword` queries the `account` table for a `credential` provider row with a non-null password. If none exists, the email is skipped and `provider_only` is logged. This preserves the generic public response (no enumeration leak) while preventing silent password creation for Google-only accounts. `revokeSessionsOnPasswordReset: true` is enabled in `emailAndPassword`; failure is surfaced by Better Auth as an unsuccessful reset, matching the spec's requirement that unconfirmed revocation MUST NOT claim success.
- [x] Confirm Redis availability/TTL and whether custom wrapper can call `auth.api.*` without bypassing the public handler.
  - **Resolution**: No Redis client or idempotency pattern exists in `auth-service`. The custom `/api/recovery/request` wrapper with Redis idempotency is deferred to a later slice. The current slice uses Better Auth's public `requestPasswordReset` endpoint; the web reset API forwards to the public `/api/auth/reset-password` endpoint.
- [x] Confirm the project’s CSRF convention; same-origin alone is the current repository pattern.
  - **Resolution**: The existing `/api/verificar-correo` route validates `Origin` against the public origin (proxy-aware). The new `/api/restablecer-contrasena` route follows the exact same pattern. No CSRF token convention is present in the repository, so this slice does not introduce one.
