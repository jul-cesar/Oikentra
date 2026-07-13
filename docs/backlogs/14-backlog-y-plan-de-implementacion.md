# 14 - Backlog y Plan de Implementación

## Estado actual

- [x] Crear `auth-service`.
- [x] Crear `oikentraauth`.
- [x] Conectar Better Auth.
- [x] Exponer `/api/auth/*`.
- [ ] Validar registro, login, sesión y logout.
- [ ] Crear `/internal/session/validate`.

---

# Prioridad 1 - Cerrar autenticación

## AUTH-01 - Validar flujo por correo

- [ ] Registro.
- [ ] Login.
- [ ] Consultar sesión.
- [ ] Logout.
- [ ] Probar cookies.
- [ ] Probar errores.

**Terminado cuando:** un usuario puede registrarse, iniciar sesión y recuperar su sesión.

## AUTH-02 - Endpoint para Traefik

```http
GET /internal/session/validate
```

- [ ] Validar cookie con Better Auth.
- [ ] Responder `401` sin sesión.
- [ ] Responder `204` con sesión válida.
- [ ] Enviar `X-User-Id` y `X-Session-Id`.
- [ ] Agregar pruebas.

## AUTH-03 - Google Auth

- [ ] Configurar credenciales.
- [ ] Configurar callback.
- [ ] Probar deep link con Expo.

Puede hacerse después del login por correo.

---

# Prioridad 2 - Crear business-service

## BUS-01 - Crear servicio

- [ ] Crear `apps/business-service`.
- [ ] Configurar Bun + Hono.
- [ ] Configurar Drizzle.
- [ ] Conectar `oikentrabusiness`.
- [ ] Agregar `/health/live`.
- [ ] Agregar `/health/ready`.
- [ ] Agregar middleware de errores.
- [ ] Agregar `requestId`.

## BUS-02 - Negocios

Endpoints:

```http
GET  /api/business/businesses
POST /api/business/businesses
GET  /api/business/businesses/:businessId
PATCH /api/business/businesses/:businessId
```

- [ ] Crear tabla `businesses`.
- [ ] Crear migración.
- [ ] Crear negocio.
- [ ] Listar negocios del usuario.
- [ ] Validar propiedad.

**Terminado cuando:** un usuario autenticado puede crear y consultar su negocio.

---

# Prioridad 3 - Conectar la app móvil

## MOB-01 - Base del proyecto

- [ ] Crear `apps/mobile`.
- [ ] Configurar Expo.
- [ ] Configurar navegación.
- [ ] Configurar cliente Better Auth.
- [ ] Crear pantallas de login y registro.
- [ ] Proteger rutas autenticadas.

## MOB-02 - Negocios

- [ ] Listar negocios.
- [ ] Crear negocio.
- [ ] Seleccionar negocio activo.
- [ ] Guardar negocio seleccionado localmente.

---

# Prioridad 4 - Primera vertical funcional

## CASH-01 - Registrar venta

Backend:

```http
POST /api/business/businesses/:businessId/sales
GET  /api/business/businesses/:businessId/cash-movements
```

- [ ] Crear tabla `cash_movements`.
- [ ] Registrar venta.
- [ ] Listar movimientos.
- [ ] Validar acceso al negocio.
- [ ] Agregar pruebas.

## MOB-03 - Venta desde la app

- [ ] Crear formulario de venta.
- [ ] Guardar venta en SQLite.
- [ ] Mostrar venta en historial local.

**Primera meta funcional:**

```txt
Usuario inicia sesión
        ↓
Crea un negocio
        ↓
Registra una venta
        ↓
La venta queda visible en la app
```

---

# Prioridad 5 - Sync-service

## SYNC-01 - Crear servicio

- [ ] Crear `apps/sync-service`.
- [ ] Configurar Bun + Hono.
- [ ] Conectar `oikentrasync`.
- [ ] Crear health checks.
- [ ] Crear middleware común.

## SYNC-02 - Push inicial

```http
POST /api/sync/push
```

- [ ] Crear `sync_outbox` en SQLite.
- [ ] Crear `processed_sync_operations` en PostgreSQL.
- [ ] Enviar una venta pendiente.
- [ ] Aplicarla mediante `business-service`.
- [ ] Marcarla como sincronizada.
- [ ] Evitar duplicados.

## SYNC-03 - Pull y bootstrap

```http
GET /api/sync/bootstrap
GET /api/sync/pull
```

- [ ] Recuperar datos en un dispositivo nuevo.
- [ ] Aplicar cambios en SQLite.
- [ ] Guardar cursor.

---

# Prioridad 6 - Clientes y fiados

## CREDIT-01 - Clientes

- [ ] Crear cliente.
- [ ] Listar clientes.
- [ ] Actualizar cliente.

## CREDIT-02 - Fiados

- [ ] Crear fiado.
- [ ] Listar fiados.
- [ ] Consultar saldo.
- [ ] Anular fiado.

## CREDIT-03 - Abonos

- [ ] Registrar abono.
- [ ] Crear movimiento de caja asociado.
- [ ] Impedir sobrepago.
- [ ] Anular abono.
- [ ] Recalcular saldo.

---

# Prioridad 7 - Reports-service

## REPORT-01 - Crear servicio

- [ ] Crear `apps/reports-service`.
- [ ] Configurar Bun + Hono.
- [ ] Agregar health checks.
- [ ] Consumir datos internos de `business-service`.

## REPORT-02 - PDF inicial

```http
POST /api/reports/businesses/:businessId/generate
```

- [ ] Generar resumen semanal en PDF.
- [ ] Devolver bytes.
- [ ] Agregar `Content-Type`.
- [ ] Agregar `Content-Disposition`.
- [ ] Previsualizar desde Expo.
- [ ] Descargar o compartir.

---

# Prioridad 8 - Infraestructura

## INFRA-01 - Desarrollo local

- [ ] Docker Compose para PostgreSQL y Redis.
- [ ] Variables por servicio.
- [ ] Scripts de migración.
- [ ] Scripts para levantar servicios.

## INFRA-02 - Dokploy

- [ ] Desplegar microservicios.
- [ ] Configurar rutas Traefik.
- [ ] Configurar HTTPS.
- [ ] Configurar `ForwardAuth`.
- [ ] Mantener servicios en red privada.
- [ ] Configurar Redis.
- [ ] Configurar backups.

---

# Próximo sprint recomendado

## Objetivo

Completar autenticación y crear el primer negocio.

### Tareas

1. Crear `/internal/session/validate`.
2. Probar registro, login, sesión y logout.
3. Crear `business-service`.
4. Conectar `oikentrabusiness`.
5. Crear tabla y endpoints de negocios.
6. Crear la base de la app Expo.
7. Conectar login y listado de negocios.

### Resultado esperado

```txt
Usuario se registra
        ↓
Inicia sesión
        ↓
Crea un negocio
        ↓
Ve el negocio en la app
```
