# Reports Service

Servicio de consulta y generacion de reportes. No puede crear ni modificar operaciones financieras y obtendra los datos autorizados desde `business-service`.

## Workspace

- Paquete: `@oikentra/reports-service`
- Runtime: Bun
- Framework HTTP: Hono
- Estado: esqueleto inicial

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
