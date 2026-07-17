# Password Recovery Specification

## Purpose

Define a web-based password recovery flow initiated from mobile, with Better Auth as the authority for reset tokens, credentials, and sessions. The mobile app MUST remain a request/deep-link client and MUST NOT add a native password-reset form.

## Requirements

### Requirement: Mobile recovery entry and request semantics

The mobile client MUST provide a forgot-password entry from sign-in, validate the email format, and check connectivity before sending. Online requests MUST use an idempotency key; offline or network failures MUST preserve the entered email and offer retry without claiming success.

#### Scenario: Online request
- GIVEN a valid email and network connectivity
- WHEN the user submits the recovery request
- THEN the client sends it once with an idempotency key and shows a generic confirmation

#### Scenario: Offline request
- GIVEN the device has no network connection
- WHEN the user submits the recovery request
- THEN no request is sent, a no-connection state is shown, and retry remains available

### Requirement: Non-enumerating provider handling

The recovery flow MUST return the same user-facing confirmation for unknown emails and MUST NOT silently create a local password for accounts whose only identity provider is Google. Google-only users MUST receive an explanation and a Google sign-in action.

#### Scenario: Unknown email
- GIVEN no account owns the submitted email
- WHEN recovery is requested
- THEN the response and timing remain indistinguishable from a known-email request

#### Scenario: Google-only account
- GIVEN the account has no password credential and uses Google
- WHEN recovery is requested
- THEN no reset email is sent and the user is directed to Google sign-in

### Requirement: Auth-service reset contract

The auth service MUST own reset-token creation, expiry, single use, rate limiting, password update, and session revocation. Its email MUST link to the approved web origin using `#token=<opaque-token>`, and its reset endpoint MUST accept the token and new password without exposing token state to other services. Auth data MUST NOT be read directly by web or mobile.

#### Scenario: Reset email delivery
- GIVEN a password-capable account and an allowed request
- WHEN the auth service issues recovery
- THEN it sends a web hash-token link and records request correlation data without logging the token

#### Scenario: Invalid token contract
- GIVEN an expired, already-used, malformed, or rate-limited token
- WHEN reset is attempted
- THEN the service returns a stable non-sensitive error category and does not change credentials

### Requirement: Web reset and password validation

The web page MUST read the token from the URL hash, require a new password and confirmation, and enforce the shared password policy (minimum eight characters). The API MUST validate origin/CSRF protection, use the auth-service reset contract, and MUST NOT accept token values from logs, referrers, or unrelated origins.

#### Scenario: Successful web reset
- GIVEN a valid unused token and matching password fields
- WHEN the user submits the form
- THEN the API changes the password, revokes all active sessions, and the page shows success

#### Scenario: Validation failure
- GIVEN a missing, short, or mismatched password
- WHEN the form is submitted
- THEN the client shows field errors and no reset request changes account state

### Requirement: Return paths and authenticated behavior

After success, the web page MUST offer a mobile deep link carrying only a success state and a web sign-in fallback. The mobile handler MUST show success, check session state, and route to home or sign-in; it MUST NOT render a password form. Authenticated users requesting recovery MUST follow the same secure flow and MUST NOT receive privileged account data.

#### Scenario: Desktop fallback
- GIVEN reset succeeds in a desktop browser
- WHEN the user selects the fallback
- THEN the user reaches web sign-in without requiring an app installation

#### Scenario: Mobile return
- GIVEN reset succeeds and the deep link is opened
- WHEN the mobile handler processes it
- THEN it routes based on session state and ignores absent or extra token parameters

### Requirement: Security, ownership, and observability

The system MUST enforce approved origins, CSRF protection, opaque single-use tokens, rate limits, and generic externally visible failures. Auth-service MUST own accounts, credentials, tokens, and sessions; web and mobile MUST own only presentation state. Structured logs MUST include request IDs and outcome categories, MUST exclude emails where avoidable, passwords, and tokens, and MUST distinguish delivery, validation, abuse-limit, provider, and dependency failures.

#### Scenario: Dependency failure
- GIVEN the auth service or email provider is unavailable
- WHEN recovery is requested or completed
- THEN the user sees a retryable generic failure, no partial credential change is reported, and the failure is observable by request ID

#### Scenario: Session revocation failure
- GIVEN password persistence succeeds but mandatory revocation cannot be confirmed
- WHEN the reset operation completes
- THEN the operation is treated as failed to the caller, is alerted with request ID, and MUST NOT claim a fully successful reset

## Non-Goals

- Native mobile password-reset UI or password entry.
- SMS/WhatsApp delivery, admin-initiated resets, remembered-device bypass, or silent local-password creation for Google identities.
