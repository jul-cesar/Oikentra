# 15 - Flujo de Registro, Perfil y Primer Negocio

## 1. Objetivo

Implementar el flujo inicial de Oikentra:

```txt
Registro
  ↓
Completar perfil
  ↓
Crear o seleccionar negocio
  ↓
Entrar a la aplicación
```

## 2. Estados del usuario

```txt
UNAUTHENTICATED
PROFILE_REQUIRED
BUSINESS_REQUIRED
READY
```

Reglas:

- Sin sesión: login o registro.
- Con sesión y perfil incompleto: onboarding de perfil.
- Con perfil completo y sin negocios: crear primer negocio.
- Con perfil completo y negocios: seleccionar negocio o usar el último.

## 3. Registro inicial

Better Auth seguirá manejando:

```txt
name
email
password
```

Después del registro se crea la sesión y la app consulta el perfil.

## 4. Perfil del usuario

El perfil se guardará en `auth_db`, en una tabla propia:

```txt
user_profiles
```

No se modificará directamente la tabla `user` de Better Auth.

Campos:

| Campo | Requerido |
|---|---:|
| `user_id` | Sí |
| `country_code` | Automático: `CO` |
| `department` | Sí |
| `city` | Sí |
| `phone` | No |
| `profile_completed_at` | Automático |
| `created_at` | Automático |
| `updated_at` | Automático |

No se pedirán inicialmente:

```txt
fecha de nacimiento
sexo o género
documento
dirección personal
```

## 5. Endpoints de perfil

### Consultar perfil

```http
GET /api/auth/profile
```

Respuesta:

```json
{
  "data": {
    "userId": "user-id",
    "countryCode": "CO",
    "department": "Sucre",
    "city": "Sincelejo",
    "phone": null,
    "profileCompleted": true
  },
  "requestId": "request-id"
}
```

Si no existe:

```json
{
  "data": {
    "profileCompleted": false
  },
  "requestId": "request-id"
}
```

### Crear o completar perfil

```http
PUT /api/auth/profile
```

Body:

```json
{
  "department": "Sucre",
  "city": "Sincelejo",
  "phone": "3001234567"
}
```

Reglas:

- `userId` se obtiene de la sesión.
- El cliente no envía `userId`.
- `countryCode` no es requerido por el cliente; el servicio persiste `CO`.
- `phone` es opcional.
- `profileCompletedAt` se asigna cuando están completos los campos requeridos.

### Actualizar perfil

```http
PATCH /api/auth/profile
```

Body parcial:

```json
{
  "city": "Montería",
  "phone": "3010000000"
}
```

## 6. Orden de rutas en Hono

Las rutas personalizadas se registran antes del wildcard de Better Auth:

```ts
app.get("/api/auth/profile", profileHandler);
app.put("/api/auth/profile", updateProfileHandler);
app.patch("/api/auth/profile", patchProfileHandler);

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});
```

Cada endpoint valida la sesión con Better Auth.

## 7. Flujo móvil

Al abrir la app:

```txt
1. Consultar sesión.
2. Sin sesión → login.
3. Consultar /api/auth/profile.
4. Perfil incompleto → onboarding.
5. Consultar negocios.
6. Sin negocios → crear negocio.
7. Con negocios → seleccionar o usar el último.
```

## 8. Pantallas

```txt
(auth)/login
(auth)/register
(onboarding)/profile
(onboarding)/business
(protected)/home
```

Formulario de perfil:

```txt
País
Departamento
Ciudad
Teléfono opcional
```

## 9. Crear primer negocio

Después del perfil:

```http
POST /api/business/businesses
```

La app podrá precargar:

```txt
countryCode
department
city
currencyCode = COP
timezone = America/Bogota
```

## 10. Tareas

### Auth service

- [ ] Crear tabla `user_profiles`.
- [ ] Crear migración Drizzle.
- [ ] Crear repositorio.
- [ ] Crear `GET /api/auth/profile`.
- [ ] Crear `PUT /api/auth/profile`.
- [ ] Crear `PATCH /api/auth/profile`.
- [ ] Validar sesión.
- [ ] Agregar pruebas.

### Mobile

- [ ] Crear estado de onboarding.
- [ ] Crear pantalla de perfil.
- [ ] Consultar perfil.
- [ ] Guardar perfil.
- [ ] Redirigir a creación de negocio.
- [ ] Manejar errores.

### Business service

- [ ] Crear endpoint de negocios.
- [ ] Precargar ubicación.
- [ ] Crear primer negocio.
- [ ] Listar negocios.

## 11. Primera entrega

El flujo termina cuando:

```txt
Usuario se registra
  ↓
Completa país, departamento y ciudad
  ↓
Crea su primer negocio
  ↓
Entra al inicio de Oikentra
```

Además:

- No se puede saltar el perfil requerido.
- `userId` siempre viene de la sesión.
- El perfil queda separado de Better Auth.
- El usuario puede actualizar su perfil después.
