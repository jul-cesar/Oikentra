# 08 - Monorepo, Workspaces y Desarrollo Local

## 1. Objetivo

Definir como se organiza, instala, ejecuta y despliega el codigo de Oikon.

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

Es la unidad de versionado. Oikon usa un solo repositorio para que un cambio coordinado en mobile, contratos y servicios pueda quedar en un mismo commit o pull request.

### Monorepo

Es un repositorio que contiene varios proyectos. No significa que exista una sola aplicacion, un solo `package.json` o un solo despliegue.

### Workspace

Es el conjunto de paquetes que pnpm reconoce y administra en una misma instalacion. Permite seleccionar proyectos por nombre, compartir el lockfile y enlazar paquetes internos.

### Paquete

Es cualquier directorio incluido en el workspace que tenga un `package.json`. Cada aplicacion de Oikon es un paquete privado.

### Microservicio

Es un limite de ejecucion, datos y despliegue. Compartir repositorio y workspace no elimina su independencia operativa.

---

## 4. Estructura del repositorio

```txt
Oikon/
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
| `apps/mobile` | `@oikon/mobile` | Expo + React Native |
| `apps/auth-service` | `@oikon/auth-service` | Bun |
| `apps/business-service` | `@oikon/business-service` | Bun |
| `apps/sync-service` | `@oikon/sync-service` | Bun |
| `apps/reports-service` | `@oikon/reports-service` | Bun |

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
  -> pnpm selecciona @oikon/auth-service
  -> ejecuta el script dev de ese paquete
  -> Bun inicia src/index.ts
```

Para mobile:

```txt
pnpm dev:mobile
  -> pnpm selecciona @oikon/mobile
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
pnpm --filter @oikon/auth-service dev
pnpm --filter @oikon/mobile android
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
pnpm --filter @oikon/auth-service add better-auth
pnpm --filter @oikon/business-service add drizzle-orm
pnpm --filter @oikon/auth-service add -D typescript
pnpm --filter @oikon/auth-service remove better-auth
```

Para dependencias de React Native se debe permitir que Expo elija una version compatible:

```bash
pnpm --filter @oikon/mobile exec expo install expo-sqlite
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
    "@oikon/api-contracts": "workspace:*"
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

## 13. Construccion y despliegue

Dokploy puede crear varias aplicaciones usando el mismo repositorio Git:

```txt
Repositorio Oikon
  -> despliegue auth-service
  -> despliegue business-service
  -> despliegue sync-service
  -> despliegue reports-service
```

Cada despliegue apunta al Dockerfile y configuracion de su servicio. Si un servicio consume un paquete bajo `packages/`, el contexto de construccion debe incluir la raiz, `pnpm-workspace.yaml` y `pnpm-lock.yaml`.

Un cambio en el repositorio no obliga a publicar todos los servicios. CI/CD debe detectar los directorios afectados o construir explicitamente el servicio seleccionado.

---

## 14. Limpieza y recuperacion

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

## 15. Estado actual

El workspace, la instalacion central y las validaciones estan configurados. Los cuatro servicios backend aun son esqueletos iniciales; pertenecer al workspace no significa que sus bases de datos, contratos o logica de negocio ya esten implementados.
