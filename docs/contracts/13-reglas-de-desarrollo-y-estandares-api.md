# 13 - Reglas de Desarrollo y Estándares de API

## 1. Objetivo

Definir reglas comunes para todos los microservicios.

Aplica a:

```txt
auth-service
business-service
sync-service
reports-service
```

---

## 2. Formato de respuestas

### Respuesta exitosa

```json
{
  "data": {},
  "meta": null,
  "requestId": "request-id"
}
```

### Respuesta paginada

```json
{
  "data": [],
  "meta": {
    "nextCursor": "cursor-value",
    "hasMore": true
  },
  "requestId": "request-id"
}
```

### Respuesta con error

```json
{
  "code": "BUSINESS_NOT_FOUND",
  "message": "No se encontró el negocio.",
  "details": null,
  "requestId": "request-id"
}
```

Reglas:

- `code` es estable y útil para el cliente.
- `message` es comprensible.
- `details` solo contiene información segura.
- `requestId` permite rastrear la petición.
- Los errores internos no exponen stack traces.

---

## 3. Códigos HTTP

| Código | Uso |
|---:|---|
| 200 | Consulta o actualización exitosa |
| 201 | Recurso creado |
| 202 | Proceso asíncrono aceptado |
| 204 | Operación exitosa sin body |
| 400 | Request mal formado |
| 401 | Usuario no autenticado |
| 403 | Usuario autenticado sin permiso |
| 404 | Recurso no encontrado |
| 409 | Conflicto de estado o idempotencia |
| 422 | Datos válidos en formato, pero no procesables |
| 429 | Límite de solicitudes excedido |
| 500 | Error interno inesperado |
| 503 | Dependencia no disponible |

---

## 4. Códigos internos de error

Formato:

```txt
UPPER_SNAKE_CASE
```

Ejemplos:

```txt
UNAUTHENTICATED
BUSINESS_ACCESS_DENIED
BUSINESS_NOT_FOUND
INVALID_AMOUNT
PAYMENT_EXCEEDS_BALANCE
VERSION_CONFLICT
IDEMPOTENCY_CONFLICT
DEPENDENCY_UNAVAILABLE
REPORT_GENERATION_FAILED
```

Los códigos no deben depender del texto del mensaje.

---

## 5. Validación

Toda entrada debe validarse antes de llegar al caso de uso.

Se validarán:

- Body.
- Query params.
- Path params.
- Headers requeridos.
- Fechas.
- UUID.
- Montos.
- Enumeraciones.

Ejemplo conceptual:

```ts
const schema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(250).optional(),
});
```

La librería de validación se definirá para todos los servicios TypeScript y se usará de forma consistente.

---

## 6. Manejo global de errores

Cada servicio tendrá un middleware global.

Flujo:

```txt
Error de dominio o infraestructura
        ↓
Middleware global
        ↓
Mapeo a código HTTP
        ↓
Respuesta estándar
        ↓
Log estructurado
```

Ejemplo conceptual con Hono:

```ts
app.onError((error, c) => {
  const requestId = c.get("requestId");

  if (error instanceof AppError) {
    return c.json(
      {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
        requestId,
      },
      error.status,
    );
  }

  console.error(error);

  return c.json(
    {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error interno.",
      details: null,
      requestId,
    },
    500,
  );
});
```

---

## 7. Clase base de error

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
  }
}
```

Ejemplo:

```ts
throw new AppError(
  "PAYMENT_EXCEEDS_BALANCE",
  422,
  "El abono supera el saldo pendiente.",
);
```

---

## 8. Request ID

Cada petición tendrá:

```http
X-Request-Id: uuid
```

Reglas:

- Si Traefik envía uno válido, se reutiliza.
- Si no existe, el servicio genera uno.
- Se devuelve en la respuesta.
- Se incluye en logs.
- Se propaga entre microservicios.

---

## 9. Logs

Los logs serán estructurados.

Campos mínimos:

```txt
timestamp
level
service
requestId
method
path
status
durationMs
userId
errorCode
```

No registrar:

- Contraseñas.
- Cookies.
- Tokens.
- Secretos.
- Datos financieros completos.
- Stack traces en respuestas públicas.

---

## 10. Comunicación entre servicios

Toda llamada interna debe incluir:

```http
X-Request-Id
X-Internal-Service
Authorization: Bearer <internal-secret>
```

Reglas:

- Usar timeouts.
- No hacer reintentos infinitos.
- Solo reintentar operaciones idempotentes.
- Convertir fallos externos a `DEPENDENCY_UNAVAILABLE`.
- No reenviar errores internos completos al cliente.

---

## 11. Idempotencia

Operaciones críticas aceptarán:

```http
Idempotency-Key: operation-uuid
```

Aplica a:

- Ventas.
- Gastos.
- Fiados.
- Abonos.
- Anulaciones.
- Sincronización.
- Generación asíncrona de reportes.

La misma clave con el mismo body devuelve el resultado anterior.

La misma clave con otro body responde:

```txt
409 IDEMPOTENCY_CONFLICT
```

---

## 12. Fechas y montos

### Fechas

- Timestamps técnicos en UTC.
- Fechas de negocio en formato `YYYY-MM-DD`.
- Zona horaria inicial: `America/Bogota`.

### Montos

- Pesos enteros.
- No usar `float` o `double`.
- Valores mayores que cero cuando aplique.

Ejemplo:

```json
{
  "amount": 25000
}
```

---

## 13. Versionado

Las rutas públicas usarán versión cuando la API se estabilice:

```txt
/api/v1/auth
/api/v1/business
/api/v1/sync
/api/v1/reports
```

Durante el desarrollo inicial se podrá usar `/api/*`, pero antes de producción se deberá definir la versión pública.

---

## 14. Nombres

### JSON

```txt
camelCase
```

### Variables y funciones

```txt
camelCase
```

### Clases y tipos

```txt
PascalCase
```

### Tablas y columnas

```txt
snake_case
```

### Códigos de error

```txt
UPPER_SNAKE_CASE
```

---

## 15. Capas por servicio

```txt
routes
schemas
services/use-cases
domain
repositories
infrastructure
```

Reglas:

- Las rutas no consultan Drizzle directamente.
- El dominio no depende de Hono.
- Los repositorios encapsulan la persistencia.
- Los casos de uso coordinan transacciones.
- La validación HTTP no reemplaza reglas de negocio.

---

## 16. Testing

Cada servicio tendrá:

- Pruebas unitarias de dominio.
- Pruebas de integración de repositorios.
- Pruebas de endpoints.
- Pruebas de autorización.
- Pruebas de errores.
- Pruebas de idempotencia cuando aplique.

---

## 17. Criterios de aceptación

- Todos los servicios usan la misma estructura de respuesta.
- Todos generan y propagan `requestId`.
- Los errores no exponen información sensible.
- Los códigos de error son estables.
- Los servicios validan entradas.
- Las llamadas internas tienen timeout.
- Las operaciones críticas son idempotentes.
- Los logs son estructurados.
- Las rutas no contienen lógica de negocio.
