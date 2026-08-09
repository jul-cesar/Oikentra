# Business Service

Owns businesses and, later, customers and financial operations for Oikentra.

## Workspace

- Package: `@oikentra/business-service`
- Runtime: Bun
- HTTP framework: Hono
- Persistence: Drizzle + PostgreSQL
- Public base path: `/api/business`

## Architecture

```txt
src/
  app.ts                         Hono app, routes, health, error handling
  index.ts                       Bun entrypoint
  config/config.ts               Environment parsing
  db/client.ts                   Drizzle/Postgres client
  db/schema.ts                   Service-owned database schema
  db/health.ts                   Database readiness check
  http/errors.ts                 AppError and validation error mapping
  http/request-context.ts        Hono request context types
  http/response.ts               Success response envelope
  http/middleware/request-id.ts  X-Request-Id propagation
  http/middleware/require-auth-headers.ts
  modules/businesses/            Businesses routes, schemas, service, repository
```

Routes validate HTTP input, services own business behavior, and repositories encapsulate Drizzle access. Routes must not query Drizzle directly.

## Environment

Copy `.env.example` and provide real deployment values outside Git.

```txt
DATABASE_URL=postgres://user:password@localhost:5432/oikentra_business
INTERNAL_AUTH_PUBLIC_KEY_B64=replace-with-base64-spki-public-key
PORT=3000

# Optional Cloudflare R2 logo uploads
R2_ACCOUNT_ID=replace-with-cloudflare-account-id
R2_BUCKET=oikentra-assets
R2_ACCESS_KEY_ID=replace-with-r2-access-key-id
R2_SECRET_ACCESS_KEY=replace-with-r2-secret-access-key
R2_PUBLIC_BASE_URL=https://assets.oikentra.com
```

## Database

Generate migrations from the service schema:

```bash
pnpm --filter @oikentra/business-service run db:generate
```

Run migrations against `DATABASE_URL`:

```bash
pnpm --filter @oikentra/business-service run db:migrate
```

The `businesses.id` column uses PostgreSQL `uuid`. IDs are generated app-side so synced entities can keep the same UUID across SQLite and PostgreSQL.

## Authentication Boundary

This service does not use Better Auth directly. Dokploy/Traefik must protect public business routes with ForwardAuth through `auth-service`.

After the session is validated, Traefik must copy the `X-Internal-Auth` response header from ForwardAuth to the protected request:

```http
X-Internal-Auth: signed-short-lived-assertion
```

The service verifies the RS256 signature, issuer, expiration, and `business-service` audience locally. Traefik must strip or overwrite any client-supplied `X-Internal-Auth` before forwarding. The service never trusts identity headers or `userId` from body, query, or path. `owner_user_id` always comes from the verified assertion subject.

## Health Endpoints

```http
GET /api/business/health/live
GET /api/business/health/ready
```

Responses use the common envelope:

```json
{
  "data": { "status": "ok", "service": "business-service" },
  "meta": null,
  "requestId": "request-id"
}
```

Readiness returns `503 DEPENDENCY_UNAVAILABLE` when PostgreSQL is unavailable.

## Business Endpoints

All business endpoints require `X-Internal-Auth`.

```http
POST /api/business/businesses/logo-upload
POST /api/business/businesses
GET /api/business/businesses
GET /api/business/businesses/:businessId
PATCH /api/business/businesses/:businessId
```

Clients select an existing business by retaining its returned `id` and using `GET /:businessId` to verify ownership before entering the business context. Selection is request context, not persisted service state.

Create body:

```json
{
  "name": "Store El Progreso",
  "businessType": "STORE",
  "description": "Tienda de barrio con domicilios.",
  "logoUrl": "https://assets.oikentra.com/business-logos/user/logo.png",
  "logoObjectKey": "business-logos/user/logo.png",
  "currencyCode": "COP",
  "timezone": "America/Bogota"
}
```

Patch body accepts any provided subset of:

```json
{
  "name": "New name",
  "businessType": "STORE",
  "description": "Tienda de barrio con domicilios.",
  "logoUrl": "https://assets.oikentra.com/business-logos/user/logo.png",
  "logoObjectKey": "business-logos/user/logo.png",
  "currencyCode": "COP",
  "timezone": "America/Bogota",
  "status": "ACTIVE"
}
```

Successful responses use:

```json
{
  "data": {},
  "meta": null,
  "requestId": "request-id"
}
```

Errors use:

```json
{
  "code": "BUSINESS_NOT_FOUND",
  "message": "The business was not found.",
  "details": null,
  "requestId": "request-id"
}
```
