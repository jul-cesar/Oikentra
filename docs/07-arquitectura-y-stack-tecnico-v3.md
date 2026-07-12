# 07 - Arquitectura y Stack Técnico

## 1. Objetivo

Definir una arquitectura inicial con microservicios desplegados en Dokploy, usando Traefik como gateway de entrada.

La solución debe soportar:

- App móvil offline-first.
- Autenticación centralizada.
- Gestión financiera por negocio.
- Sincronización entre SQLite y PostgreSQL.
- Reportes separados de la lógica transaccional.
- Despliegues independientes.
- Uso futuro de diferentes tecnologías.

---

## 2. Stack confirmado

| Componente | Tecnología |
|---|---|
| Aplicación móvil | React Native + Expo |
| Runtime y tooling móvil | Node.js |
| Gestor de paquetes y workspaces | pnpm |
| Base local | SQLite |
| ORM local | Drizzle |
| Gateway de borde | Traefik |
| Plataforma de despliegue | Dokploy |
| Auth | Better Auth |
| Backend TypeScript | Bun + Hono + TypeScript |
| Base remota | PostgreSQL |
| ORM backend | Drizzle |
| Cache, sesiones y colas | Redis |
| Contenedores | Docker |

### Runtime por tipo de aplicación

- La aplicación móvil usará Node.js para el tooling de React Native y Expo; React Native/Hermes ejecutará el código en el dispositivo.
- Los microservicios implementados en TypeScript usarán Bun como runtime, ejecutor de scripts y test runner.
- pnpm administrará dependencias, workspaces y el lockfile de todo el repositorio.
- Si un servicio futuro se implementa en Go, Java o Python, usará el runtime propio de esa tecnología.

Servicios TypeScript iniciales:

```txt
auth-service      → Bun
business-service  → Bun
sync-service      → Bun, salvo que se implemente en Go
reports-service   → Bun
```

### Organización del repositorio

Oikon se mantendrá en un único repositorio Git organizado como monorepo con pnpm workspaces:

```txt
apps/
  mobile/
  auth-service/
  business-service/
  sync-service/
  reports-service/
packages/
docs/
```

Cada aplicación conserva su propio `package.json` y declara sus propias dependencias. El repositorio mantiene un único `pnpm-lock.yaml` y la instalación se ejecuta desde la raíz.

Compartir repositorio no cambia los límites de los microservicios. Cada servicio mantiene construcción, configuración, datos y despliegue independientes. La operación local del workspace se define en [08 - Monorepo, Workspaces y Desarrollo Local](08-monorepo-workspaces-y-desarrollo-local.md).

---

## 3. Microservicios iniciales

```txt
auth-service
business-service
sync-service
reports-service
```

### `auth-service`

Responsable de:

- Registro.
- Login con correo y contraseña.
- Login con Google.
- Sesiones con cookies.
- Logout.
- Recuperación de cuenta.
- Validación interna de sesiones.

Stack inicial:

```txt
Bun + Hono + Better Auth + Drizzle + PostgreSQL + Redis
```

### `business-service`

Responsable de:

- Negocios.
- Clientes.
- Ventas.
- Gastos.
- Fiados.
- Abonos.
- Anulaciones.
- Reglas financieras.
- Autorización por negocio.

Este servicio es la autoridad sobre la lógica de negocio.

### `sync-service`

Responsable de:

- Push y pull.
- Idempotencia.
- Cursores.
- Reintentos.
- Conflictos.
- Bootstrap de un dispositivo nuevo.
- Coordinación entre SQLite y los servicios remotos.

No debe duplicar reglas financieras. Cuando recibe una operación, debe solicitar a `business-service` que la valide y aplique.

### `reports-service`

Responsable de:

- Resumen diario.
- Resumen semanal.
- Total por cobrar.
- Deudas antiguas.
- Historial consolidado.
- Comparaciones futuras.
- Exportaciones futuras.

No debe registrar ni modificar ventas, gastos, fiados o abonos.

Stack inicial recomendado:

```txt
Bun + Hono + Drizzle + PostgreSQL
```

Redis podrá usarse para cachear reportes costosos.

---

## 4. Arquitectura general

```txt
React Native + Expo
        ↓
      Traefik
  ├── /api/auth/*       → auth-service
  ├── /api/business/*   → business-service
  ├── /api/sync/*       → sync-service
  └── /api/reports/*    → reports-service
```

Todos los servicios estarán desplegados en Dokploy y conectados mediante una red interna.

---

## 5. Traefik

Traefik será el gateway de borde.

Responsabilidades:

- HTTPS.
- Certificados.
- Routing.
- ForwardAuth.
- Rate limiting básico.
- Headers.
- Balanceo.
- Logs de acceso.

No se usará Spring Cloud Gateway inicialmente.

Dominio sugerido:

```txt
https://api.nombreapp.com
```

---

## 6. Autenticación centralizada

Better Auth existirá únicamente en `auth-service`.

Flujo:

```txt
App envía cookie
        ↓
Traefik usa ForwardAuth
        ↓
auth-service valida sesión
        ↓
Traefik agrega X-User-Id
        ↓
Microservicio protegido
```

Los servicios protegidos todavía deben validar autorización sobre el negocio solicitado.

---

## 7. Comunicación entre servicios

Inicialmente se usará HTTP interno.

Ejemplos:

```txt
sync-service → business-service
reports-service → business-service
```

Rutas internas sugeridas:

```txt
POST /internal/sync/apply
GET  /internal/reports/data
GET  /internal/businesses/:id/access
```

Los endpoints internos no deben exponerse públicamente.

---

## 8. Propiedad de datos

| Servicio | Datos propios |
|---|---|
| auth-service | Usuarios, sesiones, cuentas y verificaciones |
| business-service | Negocios, clientes, movimientos, fiados y abonos |
| sync-service | Operaciones procesadas, cursores y conflictos |
| reports-service | Proyecciones, agregados y cache de reportes |

Cada servicio debe escribir únicamente en sus propias tablas.

---

## 9. PostgreSQL

Se puede usar una sola instancia con bases separadas:

```txt
auth_db
business_db
sync_db
reports_db
```

Cada servicio tendrá credenciales propias.

Para alimentar `reports-service`:

1. HTTP interno en el MVP.
2. Eventos y proyecciones en una fase futura.

---

## 10. Redis

Usos iniciales:

### Auth

- Sesiones.
- Verificaciones.
- Rate limiting.

### Sync

- Colas.
- Reintentos.
- Workers.
- Locks temporales.

### Reports

- Cache de reportes costosos.
- Resultados con TTL.

Ejemplos:

```txt
report:business:{id}:daily:{date}
report:business:{id}:weekly:{week}
report:business:{id}:receivables
```

Redis no será fuente de verdad.

---

## 11. Flujo de reportes

Primera versión:

```txt
App solicita reporte
        ↓
Traefik valida sesión
        ↓
reports-service valida acceso
        ↓
reports-service solicita datos a business-service
        ↓
Calcula o recupera cache
        ↓
Devuelve reporte
```

Futuro:

```txt
business-service publica eventos
        ↓
reports-service actualiza proyecciones
        ↓
Consultas rápidas e independientes
```

---

## 12. Arquitectura políglota

Los servicios podrán usar otras tecnologías cuando tenga sentido.

| Servicio | Tecnología posible |
|---|---|
| Auth | Bun + TypeScript + Hono |
| Negocio | Bun + TypeScript + Hono |
| Sync | Bun + TypeScript o Go |
| Reportes | Bun + TypeScript, Go, Java o Python |
| OCR/IA | Python |

No se añadirá otra tecnología únicamente por variedad.

---

## 13. Despliegue en Dokploy

Componentes:

```txt
auth-service
business-service
sync-service
reports-service
postgres
redis
```

Cada servicio tendrá:

- Dockerfile.
- `package.json` propio.
- Variables propias.
- Health checks.
- Migraciones propias.
- Imagen versionada.
- Despliegue independiente.

---

## 14. Health checks

Cada servicio expondrá:

```http
GET /health/live
GET /health/ready
```

---

## 15. Decisiones cerradas

- Cuatro microservicios iniciales.
- Un único repositorio Git organizado con pnpm workspaces.
- Un único lockfile de pnpm en la raíz.
- Bun como runtime de los servicios TypeScript, no como gestor del workspace.
- Traefik como gateway.
- Dokploy para despliegue.
- Better Auth centralizado.
- PostgreSQL separado por servicio.
- Redis para auth, sync y reportes.
- SQLite como base local móvil.
- `business-service` como autoridad del dominio.
- `reports-service` separado para consultas y agregaciones.
- Comunicación HTTP interna en el MVP.
- Arquitectura políglota permitida.

---

## 16. Decisiones pendientes

- Definir si `sync-service` se hará en TypeScript o Go.
- Definir si `reports-service` tendrá base propia desde el MVP.
- Definir cuándo introducir eventos.
- Definir estrategia de cache e invalidación.
- Definir una o varias instancias de Redis.
- Definir autenticación entre servicios.
- Definir proveedor de PostgreSQL.
- Definir CI/CD.

---

## 17. Criterios de aceptación

- Todas las peticiones públicas pasan por Traefik.
- Solo `auth-service` usa Better Auth.
- `business-service` controla las reglas financieras.
- `sync-service` no duplica lógica de negocio.
- `reports-service` no modifica operaciones financieras.
- Cada servicio escribe únicamente en sus propios datos.
- Redis no es fuente de verdad.
- Cada servicio puede desplegarse independientemente.
- La aplicación continúa funcionando offline con SQLite.
