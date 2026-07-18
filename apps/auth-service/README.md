# Auth Service

Oikentra authentication and session service. This service owns Better Auth integration and stores authentication data in PostgreSQL through Drizzle ORM.

## Workspace

- Package: `@oikentra/auth-service`
- Runtime: Bun
- HTTP framework: Hono
- Auth: Better Auth with email/password, Google sign-in, email verification, and password reset
- Database: PostgreSQL via Drizzle ORM and `postgres`

Install dependencies from the repository root with pnpm workspace filters. Do not run `bun install` inside this service.

## Environment

Copy `.env.example` to `.env` for local development and set real values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oikentra_auth
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
RESEND_API_KEY=replace-with-resend-api-key
AUTH_EMAIL_FROM=Oikentra <auth@example.com>
PORT=3001
```

Required startup variables:

- `BETTER_AUTH_SECRET`: Better Auth secret. Use a real long random secret outside examples.
- `BETTER_AUTH_URL`: Public auth service base URL used by Better Auth. This must match the Google OAuth redirect URL origin and path configuration.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials.
- `RESEND_API_KEY`: Resend API key.
- `AUTH_EMAIL_FROM`: Verified sender address, for example `Oikentra <auth@example.com>`.

The web client calls `BETTER_AUTH_URL` directly from the browser. The auth service enables credentialed CORS for the origin configured by `WEB_URL`; set that value to the deployed web origin in production.

Do not commit real credentials. Use a Resend verified domain for `AUTH_EMAIL_FROM` in production.

## Routes

- `GET /` returns a basic service response.
- `GET /api/auth/health/live` returns liveness status.
- `GET /api/auth/health/ready` checks database connectivity.
- `GET /api/auth/*` and `POST /api/auth/*` are handled by Better Auth.
- `GET /internal/session/validate` validates the current session for Traefik ForwardAuth.

Google OAuth, email verification, and password reset routes are Better Auth-owned under `/api/auth/*`. Configure the Google OAuth callback in Google Cloud to match the callback URL generated from `BETTER_AUTH_URL` for the mounted Better Auth route.

Email/password sign-in requires a verified email address. Verification emails are sent on sign-up through Resend and expire after 1 hour. Password reset emails are sent through Resend and reset tokens expire after 1 hour.

When the session is valid, the internal validation endpoint returns:

```http
HTTP/1.1 204 No Content
X-User-Id: <user-id>
X-Session-Id: <session-id>
```

When the session is missing or invalid, it returns `401 Unauthorized`. This endpoint must only be reachable from the private service network.

## Development

From the repository root:

```bash
pnpm dev:auth
```

Or with an explicit filter:

```bash
pnpm --filter @oikentra/auth-service dev
```

## Database Scripts

From the repository root:

```bash
pnpm --filter @oikentra/auth-service db:generate
pnpm --filter @oikentra/auth-service db:migrate
```

`db:generate` creates deterministic Drizzle migration files from `src/db/schema.ts`. Run `db:migrate` against the target database before serving traffic in a clean environment; the service does not auto-run migrations on startup.

## Current Limitations

- No business-domain tables belong in this service at this stage.
