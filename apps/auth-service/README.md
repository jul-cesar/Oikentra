# Auth Service

Servicio de autenticacion y sesiones de Oikon. Sera el unico servicio que integre Better Auth y sera responsable de validar la identidad usada por los demas servicios.

## Workspace

- Paquete: `@oikon/auth-service`
- Runtime: Bun
- Framework HTTP: Hono
- Estado: esqueleto inicial

## Ejecucion

Desde la raiz:

```bash
pnpm dev:auth
```

Desde este directorio:

```bash
pnpm dev
```

Las dependencias se instalan desde la raiz del repositorio con `pnpm install`. No se debe ejecutar `bun install` dentro del servicio.
