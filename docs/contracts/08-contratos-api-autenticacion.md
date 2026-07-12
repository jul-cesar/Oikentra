# 08 - Contratos de API de Autenticación

## 1. Objetivo

Definir los contratos del `auth-service`, encargado de identificar usuarios y administrar sesiones.

Este servicio utilizará:

```txt
Bun + Hono + Better Auth + Drizzle + PostgreSQL + Redis
```

Better Auth manejará los endpoints públicos de autenticación. El proyecto agregará un endpoint interno para que Traefik valide sesiones mediante `ForwardAuth`.

---

# Parte 1: Enfoque funcional

## 2. Funcionalidades

El usuario podrá:

- Registrarse con correo y contraseña.
- Iniciar sesión con correo y contraseña.
- Iniciar sesión con Google.
- Consultar su sesión actual.
- Cerrar sesión.
- Recuperar su contraseña en una fase posterior.

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

## 4. Base URL

```txt
https://api.nombreapp.com/api/auth
```

Better Auth se montará en Hono así:

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

Desde Expo se consumirá preferiblemente con:

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

---

### 5.3 Login con Google

Better Auth gestiona el flujo social mediante:

```ts
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/businesses",
});
```

En Android o iOS, el callback se convierte en un deep link de la aplicación.

El endpoint HTTP interno utilizado por Better Auth no se consumirá manualmente desde la interfaz móvil.

---

### 5.4 Consultar sesión

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

### 5.5 Cerrar sesión

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
X-User-Id: user-id
X-Session-Id: session-id
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

  c.header("X-User-Id", session.user.id);
  c.header("X-Session-Id", session.session.id);

  return c.body(null, 204);
});
```

---

## 7. Integración con Traefik

Middleware conceptual:

```yaml
- traefik.http.middlewares.app-auth.forwardauth.address=http://auth-service:3000/internal/session/validate
- traefik.http.middlewares.app-auth.forwardauth.authResponseHeaders=X-User-Id,X-Session-Id
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
- El cliente no puede definir `X-User-Id`.
- Traefik debe sobrescribir cabeceras internas de identidad.
- `/internal/*` solo será accesible desde la red privada.
- No registrar cookies, contraseñas o secretos en logs.
- Better Auth será la única autoridad sobre usuarios y sesiones.

---

## 11. Criterios de aceptación

- El usuario puede registrarse con correo.
- El usuario puede iniciar sesión con correo.
- El usuario puede iniciar sesión con Google.
- La sesión persiste al reiniciar la app.
- El usuario puede cerrar sesión.
- Traefik recibe `204` para una sesión válida.
- Traefik recibe `401` para una sesión inválida.
- Los microservicios protegidos reciben `X-User-Id`.
- Ningún servicio distinto de `auth-service` accede a las tablas de Better Auth.
