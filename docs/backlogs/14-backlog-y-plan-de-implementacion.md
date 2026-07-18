# 14 - Backlog y Plan de Implementación

## Estado actual

- [x] Crear `auth-service` y conectar Better Auth con Drizzle/PostgreSQL.
- [x] Exponer la API pública Better Auth en `/api/auth/*`.
- [x] Implementar email/password y requisito de verificación de correo.
- [x] Implementar Google OAuth para web y clientes nativos mobile.
- [x] Implementar cliente web directo mediante `NEXT_PUBLIC_AUTH_BASE_URL`.
- [x] Implementar cliente Expo con SecureStore, sesión protegida y logout.
- [x] Implementar verificación de correo web y mobile mediante enlaces/deep links.
- [x] Implementar solicitud y cambio de contraseña en el flujo web.
- [x] Retirar `X-Idempotency-Key` del flujo auth; conservar `X-Request-Id` para observabilidad.
- [x] Evitar el fallo de prerender de Next cuando falta `NEXT_PUBLIC_AUTH_BASE_URL` mediante fallback público.
- [ ] Verificar en el entorno desplegado registro, login, sesión, logout, cookies, CORS, email y OAuth.
- [ ] Cerrar la integración de `/internal/session/validate` con Traefik.
- [ ] Corregir la URL duplicada `/api/auth/api/auth/reset-password` del proxy web de recuperación.

---

# Prioridad 1 - Cerrar autenticación

## AUTH-01 - Validar flujo por correo

- [x] Implementar registro, login, sesión y logout en web y mobile.
- [x] Requerir verificación de correo antes del login por contraseña.
- [x] Implementar envío y reenvío de verificación con Resend.
- [ ] Validar en producción cookies, CORS, emails, expiración de tokens y errores.

**Terminado cuando:** un usuario puede registrarse, iniciar sesión y recuperar su sesión.

## AUTH-02 - Endpoint para Traefik

```http
GET /internal/session/validate
```

- [x] Validar cookie con Better Auth.
- [x] Responder `401` sin sesión.
- [x] Responder `204` con sesión válida.
- [x] Enviar `X-User-Id` y `X-Session-Id`.
- [ ] Integrar y verificar el middleware `ForwardAuth` en el entorno desplegado.
- [ ] Agregar pruebas.

## AUTH-03 - Google Auth

- [x] Implementar Google OAuth web contra la API pública.
- [x] Implementar Google Sign-In nativo mobile con intercambio de ID token.
- [x] Configurar en código los orígenes confiables y clientes web/iOS/Android opcionales.
- [ ] Configurar y verificar en producción `BETTER_AUTH_URL`, `WEB_URL`, IDs de cliente y secreto server-only.
- [ ] Registrar y verificar el callback web `https://api.oikentra.com/api/auth/callback/google`.
- [ ] Probar Google nativo en builds iOS/Android con identificadores y certificados reales.

Puede hacerse después del login por correo.

## AUTH-04 - Recuperación de contraseña y limpieza

- [x] Implementar solicitud de recuperación web y correo con Resend.
- [x] Implementar token en fragmento (`#token=...`) y limpieza del fragmento del historial del navegador.
- [x] Conservar `X-Request-Id` desde web hasta auth-service para correlación de logs.
- [x] Eliminar `X-Idempotency-Key` no utilizado del flujo y de CORS.
- [ ] Corregir el proxy web que concatena `/api/auth` dos veces al reenviar `reset-password`.
- [ ] Decidir si se conserva el proxy de reset o se usa exclusivamente el endpoint nativo de Better Auth.
- [ ] Agregar pruebas para URL final, token ausente/expirado, origen inválido, `429` y reintentos.
- [ ] Implementar recuperación de contraseña en mobile; actualmente está fuera de alcance.

## AUTH-05 - Configuración de despliegue

- [x] Documentar `NEXT_PUBLIC_AUTH_BASE_URL` para el cliente web y `AUTH_BASE_URL` para rutas server-side.
- [x] Documentar `EXPO_PUBLIC_AUTH_BASE_URL` y los IDs públicos de Google mobile.
- [x] Añadir fallback web para que un valor público ausente no rompa el prerender de Next.
- [ ] Confirmar variables no secretas en el proveedor de despliegue sin copiar secretos a documentación.
- [ ] Verificar CORS/trusted origins para `WEB_URL`, `oikentra://` y orígenes Expo de desarrollo.

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

- [x] Crear `apps/mobile` y configurar Expo Router.
- [x] Configurar cliente Better Auth/Expo con SecureStore.
- [x] Crear pantallas de login, registro y verificación.
- [x] Proteger rutas autenticadas y restaurar sesión.
- [x] Implementar logout y limpieza de persistencia local.
- [x] Implementar Google Sign-In nativo para iOS/Android.
- [ ] Validar en development builds; Expo Go no valida Google nativo.

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

1. Corregir y probar la URL duplicada del reset web.
2. Verificar producción: CORS, cookies, email y callback de Google.
3. Integrar `/internal/session/validate` con Traefik.
4. Crear `business-service`.
5. Conectar `oikentrabusiness`.
6. Crear tabla y endpoints de negocios.
7. Conectar la app mobile con el listado de negocios.

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
