# Employees Service

DB-backed Hono service for the employees domain. The service is configured and ready for domain modules, but it intentionally does not define employee tables or CRUD routes yet.

## Development

From the repository root:

```sh
pnpm dev:employees
```

Or from this package:

```sh
pnpm --filter @oikentra/employees-service dev
```

## Environment

Copy `env.template` to your local `.env` and fill the internal auth public key:

```sh
cp apps/employees-service/env.template apps/employees-service/.env
```

Required variables:

- `DATABASE_URL` — PostgreSQL connection string for this service.
- `INTERNAL_AUTH_PUBLIC_KEY_B64` — base64 public key used to verify internal auth assertions.
- `PORT` — optional, defaults to `3000`.
- `INTERNAL_AUTH_DEV_BYPASS` — development-only bypass for local requests.
- `INTERNAL_AUTH_DEV_USER_ID` — development-only user id when bypass is enabled.

## Health endpoints

- `GET /api/employees/health/live`
- `GET /api/employees/health/ready`

## Database

The Drizzle client and config are wired, but `src/db/schema.ts` is still a placeholder. Add domain tables before generating migrations.

```sh
pnpm --filter @oikentra/employees-service db:generate
pnpm --filter @oikentra/employees-service db:migrate
```

## Validation

```sh
pnpm --filter @oikentra/employees-service typecheck
pnpm --filter @oikentra/employees-service test
```
