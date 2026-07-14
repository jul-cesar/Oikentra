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
GATEWAY_SHARED_SECRET=replace-with-shared-gateway-secret
PORT=3000
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

After the session is validated, Dokploy/Traefik must inject or overwrite a shared gateway secret and forward only trusted internal identity headers:

```http
X-User-Id: user-id
X-Session-Id: session-id
X-Gateway-Secret: deployment-shared-secret
```

`X-Gateway-Secret` must match `GATEWAY_SHARED_SECRET`; otherwise protected routes return `401 UNAUTHENTICATED`. Traefik must strip or overwrite any client-supplied `X-User-Id`, `X-Session-Id`, and `X-Gateway-Secret` before proxying to this service. The service never trusts `userId` from body, query, or path. `owner_user_id` always comes from `X-User-Id` after the gateway secret check passes.

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

All business endpoints require `X-User-Id`, `X-Session-Id`, and `X-Gateway-Secret`.

```http
POST /api/business/businesses
GET /api/business/businesses
GET /api/business/businesses/:businessId
PATCH /api/business/businesses/:businessId
```

Create body:

```json
{
  "name": "Store El Progreso",
  "businessType": "STORE",
  "currencyCode": "COP",
  "timezone": "America/Bogota"
}
```

Patch body accepts any provided subset of:

```json
{
  "name": "New name",
  "businessType": "STORE",
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
