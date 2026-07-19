# Sync Service

Servicio responsable de push, pull, idempotencia, cursores, reintentos y conflictos. Coordina la sincronizacion, pero delega las reglas financieras a `business-service`.

## Workspace

- Paquete: `@oikentra/sync-service`
- Runtime: Bun
- Framework HTTP: Hono
- Estado: esqueleto inicial

## Authentication

Routes under `/api/sync/*` require `X-Internal-Auth`. The service verifies the RS256 signature, issuer, expiration, and `sync-service` audience locally using `INTERNAL_AUTH_PUBLIC_KEY_B64`. It never trusts browser identity headers.

Use the base64-encoded SPKI public PEM provisioned from auth-service. Keep the private PKCS#8 key only in auth-service.

## Ejecucion

Desde la raiz:

```bash
pnpm dev:sync
```

Desde este directorio:

```bash
pnpm dev
```

Las dependencias se instalan desde la raiz del repositorio con `pnpm install`. No se debe ejecutar `bun install` dentro del servicio.
