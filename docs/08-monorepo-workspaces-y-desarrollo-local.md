# 08 - Monorepo, Workspaces y Desarrollo Local

## 1. Objetivo

Definir como se organiza, instala, ejecuta y despliega el codigo de Oikentra.

Este documento describe la configuracion vigente del repositorio. No cambia los limites funcionales definidos en la arquitectura ni convierte los microservicios en una sola aplicacion.

---

## 2. Decisiones cerradas

- Todo el proyecto vive en un unico repositorio Git.
- El repositorio es un monorepo administrado con pnpm workspaces.
- pnpm es el gestor de paquetes para todo el workspace.
- Existe un unico `pnpm-lock.yaml` en la raiz.
- Cada aplicacion mantiene su propio `package.json` y declara sus propias dependencias.
- Los servicios TypeScript usan Bun como runtime y ejecutor.
- La aplicacion movil usa Expo y el tooling de Node.js; React Native ejecuta la aplicacion en el dispositivo.
- Cada microservicio se puede construir y desplegar de forma independiente.
- No se ejecutan instalaciones aisladas dentro de las aplicaciones.

---

## 3. Conceptos

### Repositorio Git

Es la unidad de versionado. Oikentra usa un solo repositorio para que un cambio coordinado en mobile, contratos y servicios pueda quedar en un mismo commit o pull request.

### Monorepo

Es un repositorio que contiene varios proyectos. No significa que exista una sola aplicacion, un solo `package.json` o un solo despliegue.

### Workspace

Es el conjunto de paquetes que pnpm reconoce y administra en una misma instalacion. Permite seleccionar proyectos por nombre, compartir el lockfile y enlazar paquetes internos.

### Paquete

Es cualquier directorio incluido en el workspace que tenga un `package.json`. Cada aplicacion de Oikentra es un paquete privado.

### Microservicio

Es un limite de ejecucion, datos y despliegue. Compartir repositorio y workspace no elimina su independencia operativa.

---

## 4. Estructura del repositorio

```txt
Oikentra/
  apps/
    mobile/
      package.json
    auth-service/
      package.json
    business-service/
      package.json
    sync-service/
      package.json
    reports-service/
      package.json
  packages/
  docs/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

Paquetes actuales:

| Directorio | Nombre del workspace | Ejecucion |
|---|---|---|
| `apps/mobile` | `@oikentra/mobile` | Expo + React Native |
| `apps/auth-service` | `@oikentra/auth-service` | Bun |
| `apps/business-service` | `@oikentra/business-service` | Bun |
| `apps/sync-service` | `@oikentra/sync-service` | Bun |
| `apps/reports-service` | `@oikentra/reports-service` | Bun |

`packages/` esta reservado para contratos y tooling compartido que tenga consumidores reales.

---

## 5. Configuracion del workspace

`pnpm-workspace.yaml` registra los directorios que pnpm debe descubrir:

```yaml
packages:
  - "apps/*"
  - "packages/*"

allowBuilds:
  unrs-resolver: true
```

`allowBuilds` permite de forma explicita el script de instalacion de `unrs-resolver`, dependencia usada por el stack de ESLint de Expo. No se desactiva globalmente la proteccion de scripts de dependencias.

El `package.json` de la raiz:

- Marca el repositorio como privado.
- Fija la version de pnpm esperada.
- Expone comandos comunes.
- No contiene la implementacion de ninguna aplicacion.

Ejemplo del flujo de un comando:

```txt
pnpm dev:auth
  -> pnpm selecciona @oikentra/auth-service
  -> ejecuta el script dev de ese paquete
  -> Bun inicia src/index.ts
```

Para mobile:

```txt
pnpm dev:mobile
  -> pnpm selecciona @oikentra/mobile
  -> ejecuta el script start
  -> Expo inicia Metro y el entorno de desarrollo
```

---

## 6. Runtime y gestor de paquetes

pnpm y Bun cumplen funciones diferentes:

| Responsabilidad | Herramienta |
|---|---|
| Instalar dependencias del repositorio | pnpm |
| Resolver workspaces y lockfile | pnpm |
| Ejecutar servicios backend | Bun |
| Ejecutar tests backend, cuando se definan | Bun |
| Iniciar y construir mobile | Expo |
| Ejecutar JavaScript en la aplicacion nativa | React Native/Hermes |

Que pnpm invoque un script no significa que pnpm sea el runtime de la aplicacion.

---

## 7. Instalacion y lockfile

La instalacion se realiza desde la raiz:

```bash
pnpm install
```

Reglas:

- Se conserva unicamente el `pnpm-lock.yaml` de la raiz.
- No se crean `bun.lock`, `package-lock.json` o lockfiles internos.
- No se ejecuta `pnpm install` dentro de cada aplicacion.
- En CI se debe usar `pnpm install --frozen-lockfile`.
- Todo cambio de dependencias debe actualizar el manifiesto del paquete correspondiente y el lockfile raiz.

El lockfile unico permite reproducir la combinacion exacta de versiones usada por todas las aplicaciones sin obligarlas a declarar las mismas dependencias.

---

## 8. Como funciona node_modules

Despues de instalar pueden existir:

```txt
node_modules/
  .pnpm/
apps/mobile/node_modules/
apps/auth-service/node_modules/
apps/business-service/node_modules/
apps/sync-service/node_modules/
apps/reports-service/node_modules/
```

Esto no representa cinco instalaciones completas:

- La raiz contiene el almacen virtual del workspace.
- Los directorios de cada paquete contienen enlaces a las dependencias declaradas por ese paquete.
- pnpm tambien utiliza un almacen global para reutilizar descargas entre proyectos.
- La aplicacion no carga dependencias directamente desde un supuesto `node_modules` global.
- Un paquete no debe importar una dependencia que no aparezca en su propio `package.json`.

Todos los `node_modules` son generados, pueden eliminarse y no deben versionarse. `pnpm install` los recrea cuando sea necesario.

---

## 9. Comandos de desarrollo

Desde la raiz:

```bash
pnpm dev:mobile
pnpm dev:auth
pnpm dev:business
pnpm dev:sync
pnpm dev:reports
```

Tambien se puede seleccionar directamente un paquete:

```bash
pnpm --filter @oikentra/auth-service dev
pnpm --filter @oikentra/mobile android
```

Desde el directorio de una aplicacion se puede ejecutar su script sin reinstalar:

```bash
pnpm dev
```

En mobile el equivalente es:

```bash
pnpm start
```

Validaciones globales:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Los comandos recursivos usan `--if-present`: solo ejecutan el script en paquetes que lo hayan definido.

---

## 10. Gestion de dependencias

Las dependencias se agregan al paquete que realmente las usa:

```bash
pnpm --filter @oikentra/auth-service add better-auth
pnpm --filter @oikentra/business-service add drizzle-orm
pnpm --filter @oikentra/auth-service add -D typescript
pnpm --filter @oikentra/auth-service remove better-auth
```

Para dependencias de React Native se debe permitir que Expo elija una version compatible:

```bash
pnpm --filter @oikentra/mobile exec expo install expo-sqlite
```

No se agrega una dependencia en la raiz para hacerla visible accidentalmente a todos los paquetes.

---

## 11. Paquetes compartidos

Un paquete compartido futuro puede vivir en:

```txt
packages/api-contracts
packages/config
packages/observability
packages/testing
```

Un consumidor lo declararia de forma explicita:

```json
{
  "dependencies": {
    "@oikentra/api-contracts": "workspace:*"
  }
}
```

Se puede compartir:

- Esquemas de requests y responses.
- Codigos de error estables.
- Configuracion de TypeScript y lint.
- Utilidades de observabilidad.
- Helpers de pruebas.

No se debe compartir:

- Acceso a bases de datos entre servicios.
- Tablas Drizzle de un servicio con otro servicio.
- Repositorios de persistencia.
- Implementaciones internas de casos de uso.
- Reglas financieras para evitar que `sync-service` las duplique.

Un paquete compartido debe existir por una necesidad real, no para centralizar codigo preventivamente.

---

## 12. Independencia de servicios

El workspace simplifica el desarrollo, pero cada microservicio mantiene:

- `package.json` propio.
- Dependencias propias.
- Variables de entorno propias.
- Dockerfile propio.
- Health checks propios.
- Migraciones propias.
- Credenciales y base de datos propias.
- Pipeline y despliegue independientes.

Los servicios no deben consultar directamente la base de datos de otro servicio. La comunicacion ocurre mediante contratos HTTP internos y, cuando se introduzcan, eventos.

---

## 13. Arquitectura interna de microservicios

Cada microservicio backend debe mantener una estructura entendible y repetible, sin convertirla en una abstraccion compartida prematura.

Estructura base recomendada:

```txt
src/
  app.ts
  index.ts
  config/
  db/
  http/
    errors.ts
    request-context.ts
    response.ts
    middleware/
  modules/
    <domain>/
      <domain>.routes.ts
      <domain>.schemas.ts
      <domain>.service.ts
      <domain>.repository.ts
```

Responsabilidades:

- `app.ts` arma la aplicacion HTTP, registra rutas, health checks y manejo global de errores.
- `index.ts` es el entrypoint del runtime.
- `config/` lee y valida variables de entorno.
- `db/` contiene cliente, schema, health checks y migraciones propias del servicio.
- `http/` contiene comportamiento transversal como envelopes, errores, request id y middleware.
- `modules/<domain>/routes` valida HTTP y delega casos de uso.
- `modules/<domain>/schemas` define validacion de body, params, query y headers.
- `modules/<domain>/service` coordina reglas de negocio y transacciones.
- `modules/<domain>/repository` encapsula persistencia; las rutas no consultan Drizzle directamente.

Rutas publicas por servicio:

| Servicio | Base publica |
|---|---|
| `auth-service` | `/api/auth` |
| `business-service` | `/api/business` |
| `sync-service` | `/api/sync` |
| `reports-service` | `/api/reports` |

Reglas:

- No se agregan endpoints publicos por fuera de la base del servicio.
- Los health checks publicos tambien viven bajo la base del servicio, por ejemplo `/api/business/health/live`.
- Los servicios protegidos que consumen identidad desde ForwardAuth deben exigir `X-Internal-Auth`. Dokploy/Traefik valida la sesión con `auth-service`, elimina o sobreescribe ese header enviado por el cliente y copia la assertion RS256 emitida por ForwardAuth. Cada servicio verifica la assertion con su propia clave pública.
- Endpoints solo internos pueden usar `/internal/*`, pero deben estar disponibles unicamente en la red privada y protegidos por autenticacion de servicio cuando corresponda.
- Un servicio no debe exponer tablas, repositorios o clientes de base de datos para que otro servicio los reutilice.
- Cada servicio declara sus dependencias en su propio `package.json`.

---

## 14. Construccion y despliegue

Dokploy puede crear varias aplicaciones usando el mismo repositorio Git:

```txt
Repositorio Oikentra
  -> despliegue auth-service
  -> despliegue business-service
  -> despliegue sync-service
  -> despliegue reports-service
```

Cada despliegue apunta al Dockerfile y configuracion de su servicio. Si un servicio consume un paquete bajo `packages/`, el contexto de construccion debe incluir la raiz, `pnpm-workspace.yaml` y `pnpm-lock.yaml`.

Para servicios protegidos detrás de ForwardAuth, `auth-service` conserva la clave privada y cada servicio recibe `INTERNAL_AUTH_PUBLIC_KEY_B64`. El proxy debe reenviar `Cookie` y `Authorization` al endpoint interno, copiar `X-Internal-Auth` de la respuesta y eliminar cualquier valor enviado por el cliente. Este patrón evita que un acceso directo al servicio pueda autenticarse con headers falsos.

Un cambio en el repositorio no obliga a publicar todos los servicios. CI/CD debe detectar los directorios afectados o construir explicitamente el servicio seleccionado.

### Pipeline de GitHub Actions

El workflow `.github/workflows/deploy.yml` genera matrices dinamicas a partir de las rutas modificadas:

| Cambio | Validacion | Despliegue |
|---|---|---|
| `apps/mobile/**` | Mobile | Ninguno; EAS se definira por separado |
| `apps/auth-service/**` | Auth | Auth |
| `apps/business-service/**` | Business | Business |
| `apps/sync-service/**` | Sync | Sync |
| `apps/reports-service/**` | Reports | Reports |
| `packages/**`, `package.json` o `pnpm-workspace.yaml` | Todas | Todos los backends |
| Solo `pnpm-lock.yaml`, sin un manifiesto asociado | Todas | Todos los backends por seguridad |
| Solo documentacion | Ninguna | Ninguno |

Los pull requests hacia `main` solo validan los paquetes afectados. Los pushes a `main` validan, construyen la imagen correspondiente, la publican en GHCR y activan su aplicacion en Dokploy. Los tags `v*.*.*` y las ejecuciones manuales validan y despliegan todos los servicios.

El repositorio necesita estos secrets de GitHub Actions:

```txt
DOKPLOY_URL
DOKPLOY_API_KEY
DOKPLOY_AUTH_APPLICATION_ID
DOKPLOY_BUSINESS_APPLICATION_ID
DOKPLOY_SYNC_APPLICATION_ID
DOKPLOY_REPORTS_APPLICATION_ID
```

Las aplicaciones de Dokploy deben estar configuradas para usar las imagenes correspondientes de GHCR:

```txt
ghcr.io/<owner>/oikentra-auth-service
ghcr.io/<owner>/oikentra-business-service
ghcr.io/<owner>/oikentra-sync-service
ghcr.io/<owner>/oikentra-reports-service
```

Cada Dockerfile usa la raiz como contexto para acceder al lockfile y al workspace, pero copia al runtime solamente las dependencias y el codigo de su servicio.

---

## 15. Limpieza y recuperacion

Para reconstruir una instalacion local se pueden eliminar los `node_modules` generados y ejecutar:

```bash
pnpm install
```

No se debe eliminar `pnpm-lock.yaml` como paso rutinario. Hacerlo vuelve a resolver versiones y reduce la reproducibilidad.

Comprobaciones utiles:

```bash
pnpm list -r --depth -1
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
```

Si un comando no encuentra un paquete, se debe verificar:

- Que el directorio coincida con los patrones de `pnpm-workspace.yaml`.
- Que exista un `package.json`.
- Que el nombre usado en `--filter` coincida con `name`.
- Que `pnpm install` se haya ejecutado desde la raiz.

---

## 16. Estado actual

El workspace, la instalacion central y las validaciones estan configurados. Los cuatro servicios backend aun son esqueletos iniciales; pertenecer al workspace no significa que sus bases de datos, contratos o logica de negocio ya esten implementados.
