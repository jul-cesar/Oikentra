# Password Recovery Specification

## Purpose

Define first-class web and mobile recovery paths with auth-service as the sole authority for tokens, credentials, password policy, and sessions. Each client MUST have one coherent platform-appropriate path.

## Requirements

### Requirement: Symmetric recovery entry and request behavior

Web and mobile MUST provide forgot-password entry, validate email format, and use the auth-service request contract. Mobile MUST check connectivity before sending, preserve the email on offline or network failure, and offer retry without claiming success. Mutating requests MUST carry an idempotency key.

#### Scenario: Online request
- GIVEN a valid email and network connectivity
- WHEN either client submits recovery
- THEN it sends one idempotent request and shows a generic confirmation

#### Scenario: Offline mobile request
- GIVEN the mobile device has no network connection
- WHEN recovery is submitted
- THEN no request is sent, a no-connection state is shown, and retry remains available

### Requirement: Non-enumerating provider handling

The flow MUST return generic externally visible behavior for unknown emails. Google-only accounts MUST NOT receive a reset email or a silently created password; they MUST receive an explanation and a Google sign-in action.

#### Scenario: Unknown email
- GIVEN no account owns the submitted email
- WHEN recovery is requested
- THEN the response and timing remain indistinguishable from a known-email request

#### Scenario: Google-only account
- GIVEN the account has no password credential and uses Google
- WHEN recovery is requested
- THEN no reset email is sent and Google sign-in is offered

### Requirement: Auth-service authority and email contract

Auth-service MUST own token creation, expiry, single use, rate limits, password updates, the shared password/session policy, and session revocation. It MUST send both links: a web link with `#token=<opaque-token>` and a mobile deep link with `?token=<opaque-token>`. Tokens MUST NOT appear in logs, referrers, or correlation data; web and mobile MUST NOT read auth data directly.

#### Scenario: Dual-link delivery
- GIVEN a password-capable account and an allowed request
- WHEN auth-service issues recovery
- THEN the email contains both platform links and logs contain only a request ID and outcome category

#### Scenario: Invalid or reused token
- GIVEN a malformed, expired, already-used, or rate-limited token
- WHEN reset is attempted
- THEN a stable non-sensitive error is returned and credentials remain unchanged

### Requirement: Platform reset paths and shared policy

Web MUST read the hash token and submit through the existing proxy page/API, enforcing origin and CSRF checks. Mobile MUST reach a native reset form through the deep link and submit with its auth client. Both MUST require matching passwords of at least eight characters and rely on auth-service for the same policy and session behavior.

#### Scenario: Successful web or mobile reset
- GIVEN a valid unused token and matching policy-compliant password fields
- WHEN the selected client submits the reset
- THEN auth-service changes the password, revokes all active sessions, and the client shows success

#### Scenario: Client validation or web-origin failure
- GIVEN missing, short, mismatched, or web-origin/CSRF-invalid input
- WHEN reset is submitted
- THEN field/security errors are shown and account state is unchanged

### Requirement: Return behavior, security, and observability

After web success, the page MUST offer a success-only mobile deep link and web sign-in fallback. Mobile MUST route to home or sign-in after checking session state. Approved origins, opaque tokens, rate limits, generic failures, request IDs, and outcome categories MUST be enforced; passwords, tokens, and avoidable email data MUST NOT be logged. Dependency failures MUST be retryable and MUST NOT claim success.

#### Scenario: Mobile return and desktop fallback
- GIVEN reset succeeds
- WHEN the user opens the mobile return link or web fallback
- THEN mobile routes by session state and web reaches sign-in without requiring the app

## Non-Goals

- SMS/WhatsApp delivery, admin-initiated resets, remembered-device bypass, or Redis idempotency.
- Cross-client reset paths beyond the one web proxy path and one native mobile path.
