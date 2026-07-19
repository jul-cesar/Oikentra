# Reports Service

Servicio de consulta y generacion de reportes. No puede crear ni modificar operaciones financieras y obtendra los datos autorizados desde `business-service`.

## Workspace

- Paquete: `@oikentra/reports-service`
- Runtime: Bun
- Framework HTTP: Hono
- Estado: esqueleto inicial

## Authentication

Routes under `/api/reports/*` require `X-Internal-Auth`. The service verifies the RS256 signature, issuer, expiration, and `reports-service` audience locally using `INTERNAL_AUTH_PUBLIC_KEY_B64`. It never trusts browser identity headers.

Use the base64-encoded SPKI public PEM provisioned from auth-service. Keep the private PKCS#8 key only in auth-service.

## Ejecucion

Desde la raiz:

```bash
pnpm dev:reports
```

Desde este directorio:

```bash
pnpm dev
```

Las dependencias se instalan desde la raiz del repositorio con `pnpm install`. No se debe ejecutar `bun install` dentro del servicio.
