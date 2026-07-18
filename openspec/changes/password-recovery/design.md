# Design: Password Recovery

## Technical Approach

Better Auth in `apps/auth-service` remains the sole authority for account/provider state, token creation, expiry, single use, rate limits, password hashing, policy, and session revocation. Web and mobile are first-class clients with one reset path each: web uses the existing page plus proxy API; mobile uses a native form reached by a deep link. Neither client reads the auth database or implements reset semantics.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Web reset | `PasswordReset` reads `#token` and posts to `/api/restablecer-contrasena` | Direct browser Better Auth call; second web form | The proxy is the existing origin/security boundary and prevents a duplicate path. |
| Mobile reset | `oikentra://auth/reset-password?token=...` opens native form and calls `authClient.resetPassword` | Web-only reset; mobile proxy | Native UX is symmetric while the service still owns the operation. |
| Email | One opaque token, two approved links: web hash and mobile query | Separate tokens; platform-specific services | One token preserves one-use semantics and supports either client without divergent authority. |
| Provider handling | Credential account check inside auth-service email callback; public result stays generic | Client-side account lookup | Google-only users receive no reset email and a safe Google sign-in action; unknown emails cannot be distinguished. |
| Idempotency/policy | Clients send `X-Idempotency-Key`; Better Auth enforces reset/rate policy; no Redis idempotency store | Client-generated dedupe or new Redis subsystem | Meets the request contract without adding an out-of-scope persistence dependency. |

**Ownership**: auth-service owns all auth data and mutation outcomes; web owns UI, hash extraction, origin/CSRF enforcement, and no persisted token; mobile owns form/navigation state and SecureStore session state; Resend owns delivery only.

## Sequence Diagrams

```text
Client ──request(email, X-Request-Id, X-Idempotency-Key)──> auth-service
  auth-service ──Better Auth requestPasswordReset──> provider check ──> Resend
  Resend ── email: web#token + mobile?token ──> user
```

```text
Web: hash → history.replaceState → proxy {token,newPassword}
     └─ Origin + CSRF check → auth-service resetPassword
        └─ password update + revoke sessions → success → app deep link or web sign-in
Mobile: deep-link query → native form → auth-service resetPassword
        └─ getSession → home if active, otherwise sign-in
```

## Interfaces / Contracts

- Request: `POST /api/auth/request-password-reset`, JSON `{email, redirectTo}`, headers `X-Request-Id: UUID`, `X-Idempotency-Key: UUID`; syntactically valid requests return generic accepted behavior for known, unknown, and Google-only emails. Offline mobile sends nothing and preserves input.
- Email: `https://oikentra.com/restablecer-contrasena#token=<opaque>` and `oikentra://auth/reset-password?token=<opaque>`. Tokens never enter logs, referrers, analytics, or request IDs.
- Web proxy: `POST /api/restablecer-contrasena`, JSON `{token,newPassword}`, `Cache-Control: no-store`; require matching public `Origin` (proxy-aware forwarded host/protocol) and the repository’s same-origin CSRF control, then forward `X-Request-Id`. Return `200 {success:true,requestId}`, stable `400` invalid/expired/used, `429` abuse, `503` dependency failure.
- Mobile calls Better Auth’s `resetPassword({token,newPassword})` directly. Both clients validate matching passwords, 8–128 characters; auth-service remains authoritative. Success is returned only after password change and session revocation.

Google-only handling is internal (`provider_only` outcome, no email). The public response remains indistinguishable from unknown email; clients may always show “Continue with Google,” avoiding enumeration while providing the correct recovery action.

## File Changes

| File | Action | Boundary |
|---|---|---|
| `apps/auth-service/src/auth.ts`, `email/auth-emails.ts` | Modify | Dual links, provider check, trusted mobile origin, safe outcome logs. |
| `apps/web/app/api/restablecer-contrasena/route.ts`, `components/password-reset.tsx` | Modify | Canonical proxy flow, strict origin/CSRF, hash scrubbing, success return. |
| `apps/mobile/app/(auth)/forgot-password.tsx`, `reset-password.tsx`, `_layout.tsx`, `lib/auth-client.ts` | Create/modify | Native entry, deep-link routing, reset export, offline/retry/session behavior. |
| `apps/mobile/components/sign-in-form.tsx`, web validation | Modify | Recovery links and shared 8–128 policy. |
| `apps/web/components/reset-password-form.tsx` | **Do not delete now** | Staged direct-client dead code; remove references and schedule deletion only after ownership review. It MUST NOT be rendered. |

## Testing, Risks, and Rollout

Typecheck plus integration/manual web, iOS, and Android checks cover offline retry, generic unknown/Google-only behavior, dual links, hash/query scrubbing, origin/CSRF rejection, token replay/expiry, policy boundaries, rate limits, delivery/auth outage, and revocation failure. The routing threat matrix is **N/A** for shell, VCS, push, PR, and executable-file boundaries; application routing is covered by the tests above.

| Risk | Mitigation |
|---|---|
| Web and mobile paths diverge | Keep reset semantics in auth-service; prohibit rendering the staged direct-client web form. |
| Query token leaks from mobile links | Accept only the deep-link handoff, avoid logging/navigation persistence, and clear consumed parameters. |
| Password changes without revocation | Treat reset as unsuccessful unless Better Auth confirms `revokeSessionsOnPasswordReset`. |

Deploy auth-service config/email/trusted origin first, then web, then mobile. Roll back mobile entry/deep-link handling, then web routes/proxy, then dual-link email; retain Better Auth schema and existing single-link compatibility. Release mobile only after web and auth-service accept the new contract. No migration is required.

## Open Questions

- [ ] Confirmm the deployed CSRF mechanism before implementation; current repository convention is same-origin `Origin` validation and must fail closed for missing/foreign browser origins.
