# Flujo de autenticación y claves internas

Oikentra usa cookies de Better Auth para los clientes y assertions JWT RS256 únicamente para la comunicación interna entre el gateway y los microservicios protegidos.

## Flujo resumido

```txt
Cliente
  │ Cookie Better Auth
  ▼
Traefik / gateway
  │ ForwardAuth
  ▼
auth-service
  │ valida la cookie
  │ devuelve X-Internal-Auth: JWT RS256
  ▼
Traefik agrega X-Internal-Auth
  ▼
business-service / sync-service / reports-service
  │ verifican el JWT
  ▼
Respuesta
```

## 1. Autenticación del cliente

El usuario inicia sesión mediante Better Auth. Auth-service:

1. Valida email/password o Google.
2. Crea la sesión en `auth_db`.
3. Devuelve una cookie de sesión `httpOnly`.

El cliente no genera, guarda ni envía un JWT interno.

En producción, para compartir la sesión entre la aplicación web y el API:

```env
AUTH_COOKIE_DOMAIN=oikentra.com
```

En desarrollo local esta variable debe permanecer vacía.

## 2. ForwardAuth

Para una petición protegida, Traefik recibe la cookie del cliente y llama internamente:

```http
GET /internal/session/validate
```

Traefik reenvía:

```http
Cookie: better-auth.session_token=...
Authorization: ...
```

Auth-service valida la sesión con Better Auth.

### Sesión válida

Auth-service responde:

```http
204 No Content
X-Internal-Auth: <JWT RS256>
```

### Sesión inválida

Auth-service responde:

```http
401 Unauthorized
```

Traefik no debe exponer públicamente `/internal/session/validate`.

## 3. Assertion interna RS256

La assertion se firma con una clave privada que solo conoce auth-service. Tiene una vigencia corta, actualmente 60 segundos, y contiene claims equivalentes a:

```json
{
  "iss": "oikentra.internal-auth",
  "sub": "user-id",
  "sid": "session-id",
  "aud": "business-service",
  "iat": 1234567890,
  "exp": 1234567950
}
```

Cada microservicio valida:

- Algoritmo `RS256`.
- Firma.
- `issuer` (`oikentra.internal-auth`).
- `audience` propia del servicio.
- Fecha de expiración.
- `sub` y `sid`.

Las audiences son:

| Servicio | Audience |
|---|---|
| Business | `business-service` |
| Sync | `sync-service` |
| Reports | `reports-service` |

Un token creado para un servicio no debe aceptarse en otro.

## 4. Variables de entorno

### Auth-service

```env
INTERNAL_AUTH_PRIVATE_KEY_B64=<clave privada PKCS#8 en Base64>
```

La clave privada nunca debe estar en el cliente, Traefik, business-service, sync-service ni reports-service.

### Servicios protegidos

Business, sync y reports reciben la misma clave pública:

```env
INTERNAL_AUTH_PUBLIC_KEY_B64=<clave pública SPKI en Base64>
```

### Desarrollo local sin Traefik

Para probar endpoints protegidos localmente sin levantar Traefik, se permite un bypass estrictamente de desarrollo:

```env
NODE_ENV=development
INTERNAL_AUTH_DEV_BYPASS=true
INTERNAL_AUTH_DEV_USER_ID=local-test-user
```

El bypass solo se activa cuando `NODE_ENV=development`. En producción se ignora aunque la variable exista.

El contexto local utilizado es:

```txt
userId: local-test-user
sessionId: local-test-session
```

No usar este bypass en Dokploy ni en ningún entorno compartido.

## 5. Generar las claves RSA

### Opción recomendada: OpenSSL

Generar la clave privada RSA de 2048 bits:

```bash
openssl genpkey \
  -algorithm RSA \
  -pkeyopt rsa_keygen_bits:2048 \
  -out internal-auth-private.pem
```

Extraer la clave pública en formato SPKI:

```bash
openssl rsa \
  -pubout \
  -in internal-auth-private.pem \
  -out internal-auth-public.pem
```

### Convertir a Base64

En Linux:

```bash
base64 -w 0 internal-auth-private.pem > internal-auth-private.b64
base64 -w 0 internal-auth-public.pem > internal-auth-public.b64
```

En macOS:

```bash
base64 < internal-auth-private.pem | tr -d '\n' > internal-auth-private.b64
base64 < internal-auth-public.pem | tr -d '\n' > internal-auth-public.b64
```

En PowerShell:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("internal-auth-private.pem")
)

[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("internal-auth-public.pem")
)
```

## 6. Distribuir las claves

Configurar el valor privado únicamente en auth-service:

```env
INTERNAL_AUTH_PRIVATE_KEY_B64=<contenido de internal-auth-private.b64>
```

Configurar el valor público en cada servicio protegido:

```env
INTERNAL_AUTH_PUBLIC_KEY_B64=<contenido de internal-auth-public.b64>
```

Distribución:

```txt
internal-auth-private.b64 → auth-service
internal-auth-public.b64  → business-service
internal-auth-public.b64  → sync-service
internal-auth-public.b64  → reports-service
```

## 7. Configuración de Traefik

El middleware debe eliminar cualquier token enviado por el cliente antes de ejecutar ForwardAuth:

```yaml
http:
  middlewares:
    oikon-strip-internal-auth:
      headers:
        customRequestHeaders:
          X-Internal-Auth: ""

    oikon-forward-auth:
      forwardAuth:
        address: "http://auth-service:3001/internal/session/validate"
        trustForwardHeader: false
        authRequestHeaders:
          - Cookie
          - Authorization
        authResponseHeaders:
          - X-Internal-Auth

    oikon-protected:
      chain:
        middlewares:
          - oikon-strip-internal-auth
          - oikon-forward-auth
```

Los routers de business, sync y reports usan:

```txt
oikon-protected@file
```

El router de `/api/auth/*` no usa ForwardAuth.

## 8. Reglas de seguridad

- No registrar cookies, claves privadas ni JWT internos completos.
- No exponer auth-service ni `/internal/session/validate` públicamente.
- No aceptar `X-User-Id`, `X-Session-Id` ni `X-Internal-Auth` directamente desde el cliente.
- Rotar el par RSA generando una nueva pareja y desplegando coordinadamente.
- Mantener la clave privada únicamente en el gestor de secretos de auth-service.
- Ejecutar `db:generate` y `db:migrate` cuando una modificación de esquema lo requiera; este flujo de claves no modifica la base de datos.
