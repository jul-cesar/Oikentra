# Sync Service

Servicio responsable de push, pull, idempotencia, cursores, reintentos y conflictos. Coordina la sincronizacion, pero delega las reglas financieras a `business-service`.

## Workspace

- Paquete: `@oikon/sync-service`
- Runtime: Bun
- Framework HTTP: Hono
- Estado: esqueleto inicial

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
