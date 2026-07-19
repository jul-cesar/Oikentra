# 08 - Contratos de API de Autenticación

## 1. Objetivo

Definir los contratos del `auth-service`, encargado de identificar usuarios y administrar sesiones.

Este servicio utilizará:

```txt
Bun + Hono + Better Auth + Drizzle + PostgreSQL + Redis
```

Better Auth maneja los endpoints públicos de autenticación. El proyecto agrega un endpoint interno para que Traefik valide sesiones mediante `ForwardAuth`.

## 1.1 Estado de implementación

| Área | Estado | Fuente o alcance |
|---|---|---|
| `auth-service` como autoridad de usuarios y sesiones | **Completado en código** | `apps/auth-service`, Better Auth + Drizzle + PostgreSQL |
| API pública | **Completado en código** | `https://api.oikentra.com/api/auth` en producción; `/api/auth/*` en Hono |
| Cliente web directo | **Completado en código** | Better Auth desde el navegador con `NEXT_PUBLIC_AUTH_BASE_URL` |
| Cliente Expo/mobile | **Completado en código** | Email/password, verificación, Google nativo, sesión y logout |
| Validación de sesión para Traefik | **Completado en código** | Cookie Better Auth validada y assertion interna RS256 emitida |
| Pruebas completas de producción | **Pendiente de verificación** | No se debe inferir éxito productivo solo por la existencia del código |

La URL pública es el origen de API, no una ruta de la aplicación web. En producción el navegador y los enlaces de autenticación deben usar `https://api.oikentra.com` como origen de Better Auth y `https://api.oikentra.com/api/auth` como base de sus endpoints.

---

# Parte 1: Enfoque funcional

## 2. Funcionalidades

El usuario podrá:

- Registrarse con correo y contraseña.
- Iniciar sesión con correo y contraseña.
- Iniciar sesión con Google.
- Consultar su sesión actual.
- Cerrar sesión.
- Verificar su correo electrónico.
- Recuperar su contraseña.

El servicio también permitirá que Traefik valide una sesión antes de enviar una petición a otro microservicio.

---

## 3. Reglas principales

- Solo `auth-service` utiliza Better Auth.
- Las contraseñas no se exponen ni se almacenan en otros servicios.
- La sesión se maneja mediante cookies.
- `business-service`, `sync-service` y `reports-service` reciben la identidad ya validada.
- Tener una sesión válida no concede automáticamente acceso a cualquier negocio.
- La autorización por negocio corresponde a `business-service`.
- Los endpoints internos no deben exponerse públicamente.

---

# Parte 2: Contratos técnicos

## Perfil de onboarding de Colombia

`PUT /api/auth/profile` recibe `department`, `city` y opcionalmente `phone`. El cliente no debe enviar un país: el servicio usa `countryCode: "CO"` por defecto y persiste `CO` en perfiles nuevos y actualizados. `country_code` se conserva en la base de datos para una futura expansión internacional, pero no es un requisito de interfaz.

## 4. Base URL

```txt
https://api.oikentra.com/api/auth
```

Better Auth está montado en Hono así:

```ts
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});
```

---

## 5. Endpoints públicos

### 5.1 Registro con correo

```http
POST /api/auth/sign-up/email
```

Body:

```json
{
  "name": "Julio Martínez",
  "email": "julio@example.com",
  "password": "password-seguro"
}
```

Reglas:

- Nombre obligatorio.
- Correo válido.
- Contraseña mínima de 8 caracteres.
- Better Auth genera el usuario y la sesión.

Desde Expo y web se consume mediante el cliente oficial de Better Auth. Expo usa preferiblemente:

```ts
await authClient.signUp.email({
  name,
  email,
  password,
});
```

---

### 5.2 Login con correo

```http
POST /api/auth/sign-in/email
```

Body:

```json
{
  "email": "julio@example.com",
  "password": "password-seguro",
  "rememberMe": true
}
```

Desde Expo:

```ts
await authClient.signIn.email({
  email,
  password,
  rememberMe: true,
});
```

Resultado:

- Sesión creada.
- Cookie de sesión almacenada por la integración de Expo.
- Usuario autenticado disponible en la app.

Si el correo no está verificado, Better Auth rechaza el inicio de sesión y gestiona el envío de verificación según su flujo nativo.

---

### 5.3 Login con Google

Better Auth gestiona el flujo social mediante:

```ts
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/businesses",
});
```

En web, el navegador inicia el flujo directamente contra `NEXT_PUBLIC_AUTH_BASE_URL`. En producción, el callback esperado para el cliente web es:

```txt
https://api.oikentra.com/api/auth/callback/google
```

En Android o iOS, el cliente móvil usa Google Sign-In nativo, intercambia el ID token con Better Auth y no usa el callback web del navegador.

El endpoint HTTP interno utilizado por Better Auth no se consumirá manualmente desde la interfaz móvil.

---

### 5.4 Verificación de correo y recuperación de contraseña

Better Auth gestiona los endpoints nativos de verificación de correo y recuperación de contraseña bajo `/api/auth/*`.

Reglas:

- El registro con correo envía un correo de verificación mediante Resend.
- El inicio de sesión con correo requiere que el correo esté verificado.
- La recuperación de contraseña envía un correo mediante Resend.
- Los tokens de verificación y recuperación expiran en 1 hora.
- Las rutas exactas pertenecen a Better Auth y no se definen como contratos propios del proyecto.

#### Flujo web de recuperación

1. Web solicita el reset mediante `authClient.requestPasswordReset`.
2. Auth-service genera el token y envía el correo mediante Resend.
3. El enlace llega a `/reset-password` con el token en el fragmento URL (`#token=...`), para que no viaje en la petición HTTP inicial.
4. Web lee el fragmento una sola vez y lo elimina del historial del navegador.
5. Web envía el cambio a `/api/restablecer-contrasena`, que valida origen y reenvía a Better Auth.

#### Flujo móvil de recuperación

1. Mobile solicita el reset con `redirectTo: 'oikentra://auth/reset-password'`.
2. Auth-service conserva el contrato de proveedor y genera el enlace nativo `oikentra://auth/reset-password?token=...`.
3. Mobile lee el token del deep link y envía el cambio directamente a Better Auth mediante `authClient.resetPassword`.
4. Si la cuenta no tiene una cuenta `credential`, auth-service devuelve `PASSWORD_RESET_NOT_AVAILABLE`; los clientes muestran el mensaje para continuar con Google.

La ruta `apps/web/app/api/restablecer-contrasena/route.ts` reenvía a `AUTH_BASE_URL + /reset-password`; `AUTH_BASE_URL` ya representa la base `/api/auth`, por lo que no se duplica ese prefijo.

**Candidatos de limpieza:** unificar el uso de la ruta nativa de Better Auth y del proxy web, eliminar rutas/redirects heredados cuando ya no tengan consumidores, y cubrir la recuperación con pruebas de URL, fragmento, token expirado y respuesta `429`.

---

### 5.5 Consultar sesión

```http
GET /api/auth/get-session
```

Desde Expo:

```ts
const { data: session } = await authClient.getSession();
```

Respuesta conceptual:

```json
{
  "session": {
    "id": "session-id",
    "userId": "user-id",
    "expiresAt": "2026-08-11T10:00:00Z"
  },
  "user": {
    "id": "user-id",
    "name": "Julio Martínez",
    "email": "julio@example.com"
  }
}
```

Si no existe sesión válida, la respuesta no contiene una sesión activa.

---

### 5.6 Cerrar sesión

```http
POST /api/auth/sign-out
```

Desde Expo:

```ts
await authClient.signOut();
```

Resultado:

- La sesión actual se revoca.
- La cookie local se elimina.
- Los datos financieros locales no se eliminan automáticamente.

---

## 6. Endpoint interno para Traefik

```http
GET /internal/session/validate
```

Este endpoint no será público.

### Solicitud

Traefik reenvía las cabeceras originales, incluyendo la cookie de sesión.

### Respuesta válida

```http
HTTP/1.1 204 No Content
X-Internal-Auth: <signed-jwt>
```

### Respuesta inválida

```http
HTTP/1.1 401 Unauthorized
```

Body opcional:

```json
{
  "code": "UNAUTHENTICATED",
  "message": "La sesión no es válida."
}
```

### Implementación conceptual

```ts
app.get("/internal/session/validate", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json(
      {
        code: "UNAUTHENTICATED",
        message: "La sesión no es válida.",
      },
      401,
    );
  }

   c.header("X-Internal-Auth", signedAssertion);

  return c.body(null, 204);
});
```

---

## 7. Integración con Traefik

Middleware conceptual:

```yaml
- traefik.http.middlewares.oikon-forward-auth.forwardauth.address=http://auth-service:3001/internal/session/validate
- traefik.http.middlewares.oikon-forward-auth.forwardauth.authRequestHeaders=Cookie,Authorization
- traefik.http.middlewares.oikon-forward-auth.forwardauth.authResponseHeaders=X-Internal-Auth
- traefik.http.middlewares.oikon-strip-internal-auth.headers.customRequestHeaders.X-Internal-Auth=

Apply `oikon-strip-internal-auth` before `oikon-forward-auth` on every protected router. ForwardAuth must copy its `X-Internal-Auth` response header to the downstream request. Keep `auth-service` and `/internal/session/validate` on the private network with no public router.
```

Aplicación en servicios protegidos:

```yaml
- traefik.http.routers.business.middlewares=app-auth@docker
- traefik.http.routers.sync.middlewares=app-auth@docker
- traefik.http.routers.reports.middlewares=app-auth@docker
```

El router de `/api/auth/*` no utiliza `ForwardAuth`.

---

## 8. Cookies y Expo

- Better Auth administra la cookie de sesión.
- En producción la cookie debe ser segura y `httpOnly`.
- La app Expo usará el cliente oficial de Better Auth.
- La sesión y las cookies se persistirán mediante almacenamiento seguro compatible con Expo.
- La app no guardará contraseñas.
- Todas las llamadas públicas usarán el mismo dominio de API.

For the production split-origin web flow, set the auth-service-only variable `AUTH_COOKIE_DOMAIN=oikentra.com`. This enables Better Auth `advanced.crossSubDomainCookies` so the browser sends the unchanged session cookie from `api.oikentra.com` to the same-origin web proxy at `oikentra.com`. Leave it unset in local development so localhost cookies remain host-only. Better Auth keeps the existing cookie names, `httpOnly`, and HTTPS security behavior. Users may need to sign in again after changing cookie scope because the old host-only cookie is not automatically migrated.

El cliente web realiza solicitudes directas con CORS credentialed. `auth-service` permite como origen confiable `WEB_URL` y los deep links móviles configurados; su CORS permite `Content-Type`, `Authorization` y `X-Request-Id`. `X-Idempotency-Key` no forma parte del flujo de autenticación y fue retirado.

`X-Request-Id` sí se conserva: el cliente puede enviarlo, auth-service lo propaga y lo usa para correlacionar logs, especialmente en recuperación de contraseña. No implementa deduplicación de operaciones.

## 8.1 Variables de entorno de despliegue

No incluir valores secretos en documentación ni imágenes de cliente.

| Servicio | Variables relevantes | Estado |
|---|---|---|
| auth-service | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `INTERNAL_AUTH_PRIVATE_KEY_B64` | **Requeridas para iniciar** |
| business/sync/reports | `INTERNAL_AUTH_PUBLIC_KEY_B64` | **Requerida para verificar assertions** |
| auth-service móvil | `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | **Opcionales en código; requeridas para los builds nativos correspondientes** |
| auth-service (production web split-origin) | `AUTH_COOKIE_DOMAIN=oikentra.com` | **Optional; leave unset locally** |
| web | `NEXT_PUBLIC_AUTH_BASE_URL`, `AUTH_BASE_URL` | **Requeridas según el runtime**; la primera se embebe en `next build` |
| mobile | `EXPO_PUBLIC_AUTH_BASE_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | **Requeridas al iniciar el cliente** |
| mobile iOS/Android | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | **Requeridas para Google nativo en la plataforma correspondiente** |

Para producción, configurar en Google Cloud el callback `https://api.oikentra.com/api/auth/callback/google` para el cliente web y verificar que `BETTER_AUTH_URL` apunte al origen público del auth-service. La existencia de estas variables no demuestra por sí sola que OAuth, correo o CORS estén operativos en producción.

### Provisionamiento de claves internas

Generar una pareja RSA fuera del repositorio y guardar únicamente los valores base64 en el gestor de secretos:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out internal-auth-private.pem
openssl rsa -pubout -in internal-auth-private.pem -out internal-auth-public.pem
base64 -w 0 internal-auth-private.pem
base64 -w 0 internal-auth-public.pem
```

El primer valor se configura solo como `INTERNAL_AUTH_PRIVATE_KEY_B64` en auth-service. El segundo se configura como `INTERNAL_AUTH_PUBLIC_KEY_B64` en business, sync y reports. En plataformas sin `base64 -w 0`, eliminar los saltos de línea del resultado antes de provisionarlo. No registrar, commitear ni incluir las claves reales en imágenes o clientes.

El fallback de `apps/web/lib/auth-client.ts` a `https://api.oikentra.com/api/auth` es intencional: evita que un `NEXT_PUBLIC_AUTH_BASE_URL` ausente rompa la evaluación/prerender de Next.js. Debe preferirse configurar la variable explícitamente en cada despliegue.

---

## 9. Códigos de respuesta principales

| Código | Significado |
|---:|---|
| 200 | Operación completada |
| 204 | Sesión interna válida |
| 400 | Datos inválidos |
| 401 | Sesión o credenciales inválidas |
| 403 | Acción no permitida o correo no verificado |
| 409 | Conflicto de datos cuando aplique |
| 429 | Demasiados intentos |
| 500 | Error interno |
| 503 | Servicio de autenticación no disponible |

Los endpoints administrados por Better Auth conservarán su formato de respuesta nativo.

Los endpoints propios usarán:

```json
{
  "code": "ERROR_CODE",
  "message": "Mensaje comprensible.",
  "requestId": "request-id"
}
```

---

## 10. Seguridad

- HTTPS obligatorio en producción.
- Rate limiting para registro y login.
- Secretos en variables de entorno.
- El cliente no puede definir `X-Internal-Auth`; Traefik debe eliminarlo y copiar únicamente la respuesta de ForwardAuth.
- El JWT interno no se entrega al navegador ni a la aplicación móvil.
- El assertion RS256 contiene `iss`, `sub`, `sid`, `aud`, `iat` y `exp`; cada servicio verifica firma, issuer, expiración y su propia audiencia.
- `/internal/*` solo será accesible desde la red privada.
- No registrar cookies, contraseñas o secretos en logs.
- Better Auth será la única autoridad sobre usuarios y sesiones.

---

## 11. Criterios de aceptación

- El usuario puede registrarse con correo.
- El usuario verifica su correo antes de iniciar sesión con correo y contraseña.
- El usuario puede iniciar sesión con correo.
- El usuario puede iniciar sesión con Google.
- El usuario puede recuperar su contraseña mediante el flujo nativo de Better Auth.
- La sesión persiste al reiniciar la app.
- El usuario puede cerrar sesión.
- Traefik recibe `204` para una sesión válida.
- Traefik recibe `401` para una sesión inválida.
- Los microservicios protegidos reciben y verifican `X-Internal-Auth` localmente.
- Ningún servicio distinto de `auth-service` accede a las tablas de Better Auth.
