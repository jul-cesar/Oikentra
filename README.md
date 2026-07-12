# Oikon

Oikon es una aplicacion movil offline-first para gestionar caja, clientes y fiados en pequenos negocios. El proyecto usa una aplicacion Expo y cuatro microservicios desplegables de forma independiente.

## Estructura

```txt
apps/
  mobile/             React Native + Expo
  auth-service/       Autenticacion y sesiones
  business-service/   Negocios y reglas financieras
  sync-service/       Sincronizacion offline
  reports-service/    Consultas y documentos
packages/             Contratos y tooling compartido futuro
```

Todo vive en un unico repositorio Git y se coordina como un workspace de pnpm. Cada aplicacion conserva su propio `package.json`, dependencias, scripts y limites de despliegue.

## Requisitos

- pnpm 11.9.0
- Bun para los servicios backend
- Node.js para el tooling de Expo
- Android Studio o un dispositivo compatible para desarrollo Android

## Instalacion

Las dependencias se instalan una sola vez desde la raiz:

```bash
pnpm install
```

No se debe ejecutar `npm install`, `bun install` ni crear lockfiles dentro de las aplicaciones.

## Desarrollo

```bash
pnpm dev:mobile
pnpm dev:auth
pnpm dev:business
pnpm dev:sync
pnpm dev:reports
```

Validaciones disponibles:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm test` ejecuta solamente los paquetes que tengan un script `test` definido.

## Documentacion

- [Planificacion general](docs/00-general-planning.md)
- [Arquitectura y stack tecnico](docs/07-arquitectura-y-stack-tecnico-v3.md)
- [Monorepo, workspaces y desarrollo local](docs/08-monorepo-workspaces-y-desarrollo-local.md)
- [Contratos y reglas de desarrollo](docs/contracts/13-reglas-de-desarrollo-y-estandares-api.md)
