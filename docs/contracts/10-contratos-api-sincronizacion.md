# 10 - Contratos de API de Sincronización

## 1. Objetivo

Definir los contratos de `sync-service`, encargado de sincronizar SQLite con los servicios remotos.

Stack inicial:

```txt
Bun + Hono + PostgreSQL + Redis
```

`sync-service` coordina la sincronización, pero no valida reglas financieras. Las operaciones de negocio se aplican mediante `business-service`.

---

## 2. Base URL

```txt
https://api.nombreapp.com/api/sync
```

Todas las rutas requieren sesión válida mediante Traefik `ForwardAuth`.

Cabeceras internas:

```http
X-User-Id: user-id
X-Session-Id: session-id
```

---

## 3. Conceptos

- `deviceId`: identifica la instalación.
- `operationId`: UUID único para evitar duplicados.
- `cursor`: marca el último cambio remoto recibido.
- `version`: detecta cambios concurrentes.

---

## 4. Bootstrap

```http
GET /api/sync/bootstrap
```

Parámetro opcional:

```txt
businessId
```

Respuesta:

```json
{
  "data": {
    "serverTime": "2026-07-11T20:00:00Z",
    "cursor": "cursor-100",
    "businesses": [],
    "customers": [],
    "cashMovements": [],
    "credits": [],
    "creditPayments": []
  },
  "requestId": "request-id"
}
```

Se utiliza para recuperar datos en un dispositivo nuevo o reconstruir SQLite.

---

## 5. Push de operaciones

```http
POST /api/sync/push
```

Body:

```json
{
  "deviceId": "device-id",
  "operations": [
    {
      "operationId": "operation-uuid",
      "businessId": "business-id",
      "type": "SALE_CREATED",
      "entityId": "movement-id",
      "occurredAt": "2026-07-11T15:30:00-05:00",
      "payload": {
        "amount": 25000,
        "category": "GENERAL",
        "note": "Venta mostrador",
        "businessDate": "2026-07-11"
      }
    }
  ]
}
```

Tipos iniciales:

```txt
BUSINESS_CREATED
BUSINESS_UPDATED
CUSTOMER_CREATED
CUSTOMER_UPDATED
SALE_CREATED
EXPENSE_CREATED
CASH_MOVEMENT_CANCELLED
CREDIT_CREATED
CREDIT_CANCELLED
CREDIT_PAYMENT_CREATED
CREDIT_PAYMENT_CANCELLED
```

---

## 6. Respuesta de push

```json
{
  "data": {
    "accepted": [
      {
        "operationId": "operation-uuid",
        "entityId": "movement-id",
        "version": 1
      }
    ],
    "rejected": [],
    "cursor": "cursor-101",
    "serverTime": "2026-07-11T20:05:00Z"
  },
  "requestId": "request-id"
}
```

Operación rechazada:

```json
{
  "operationId": "operation-uuid",
  "code": "PAYMENT_EXCEEDS_BALANCE",
  "message": "El abono supera el saldo pendiente.",
  "retryable": false
}
```

Reglas:

- Cada operación debe incluir `operationId`.
- La misma operación no puede procesarse dos veces.
- Las operaciones se procesan en el orden recibido.
- `business-service` valida las reglas financieras.
- Redis puede manejar colas y reintentos, pero PostgreSQL conserva el resultado definitivo.

---

## 7. Pull de cambios

```http
GET /api/sync/pull?cursor=cursor-100
```

Respuesta:

```json
{
  "data": {
    "changes": [
      {
        "changeId": "change-id",
        "entityType": "CREDIT",
        "entityId": "credit-id",
        "operation": "UPDATED",
        "version": 2,
        "data": {
          "status": "PAID",
          "remainingAmount": 0
        }
      }
    ],
    "nextCursor": "cursor-101",
    "hasMore": false,
    "serverTime": "2026-07-11T20:10:00Z"
  },
  "requestId": "request-id"
}
```

Reglas:

- Solo devuelve datos accesibles por el usuario.
- Los cambios se entregan en un orden estable.
- El cursor no debe retroceder.
- La app aplica los cambios dentro de una transacción SQLite.
- Los registros anulados también se sincronizan.

---

## 8. Estado de sincronización

```http
GET /api/sync/status?deviceId=device-id
```

Respuesta:

```json
{
  "data": {
    "deviceId": "device-id",
    "lastPushAt": "2026-07-11T20:05:00Z",
    "lastPullAt": "2026-07-11T20:10:00Z",
    "lastCursor": "cursor-101",
    "pendingJobs": 0,
    "status": "UP_TO_DATE"
  },
  "requestId": "request-id"
}
```

Estados:

```txt
UP_TO_DATE
PENDING
PROCESSING
ERROR
```

---

## 9. Conflictos

Ejemplo:

```json
{
  "operationId": "operation-uuid",
  "code": "VERSION_CONFLICT",
  "message": "El registro fue actualizado en otro dispositivo.",
  "retryable": false,
  "details": {
    "localVersion": 1,
    "serverVersion": 2,
    "serverData": {}
  }
}
```

Para el MVP:

- El servidor conserva la versión aceptada.
- La app marca el registro como conflicto.
- El usuario puede revisar y reenviar el cambio.
- No se aplica `last write wins` silencioso.
- Las operaciones financieras se crean o anulan; no se editan libremente.

---

## 10. Comunicación interna con business-service

```http
POST /internal/sync/apply
```

Body conceptual:

```json
{
  "userId": "user-id",
  "operationId": "operation-uuid",
  "businessId": "business-id",
  "type": "CREDIT_PAYMENT_CREATED",
  "payload": {}
}
```

Respuesta:

```json
{
  "accepted": true,
  "entityId": "payment-id",
  "version": 1
}
```

Este endpoint:

- Solo es accesible desde la red interna.
- Requiere autenticación entre servicios.
- Aplica las mismas reglas que los endpoints públicos.

---

## 11. Idempotencia

PostgreSQL de `sync-service` mantendrá:

```txt
processed_sync_operations
```

Campos mínimos:

```txt
operation_id
user_id
device_id
status
result
processed_at
```

Si una operación ya fue procesada:

- Se devuelve el resultado anterior.
- No se vuelve a ejecutar.
- Si cambió el contenido con la misma clave, responde `IDEMPOTENCY_CONFLICT`.

---

## 12. Errores principales

| Código | Significado |
|---|---|
| `INVALID_SYNC_BATCH` | Lote inválido |
| `OPERATION_NOT_SUPPORTED` | Tipo no soportado |
| `IDEMPOTENCY_CONFLICT` | Clave reutilizada con otros datos |
| `BUSINESS_ACCESS_DENIED` | Sin acceso al negocio |
| `VERSION_CONFLICT` | Versión desactualizada |
| `DEPENDENCY_UNAVAILABLE` | Otro servicio no disponible |
| `SYNC_PROCESSING_ERROR` | Error procesando el lote |
| `CURSOR_INVALID` | Cursor inválido o expirado |

---

## 13. Códigos HTTP

| Código | Uso |
|---:|---|
| 200 | Push, pull o consulta correcta |
| 400 | Lote o cursor inválido |
| 401 | Sin sesión |
| 403 | Sin acceso |
| 409 | Conflicto |
| 422 | Operación no procesable |
| 429 | Demasiadas solicitudes |
| 500 | Error interno |
| 503 | Dependencia no disponible |

---

## 14. Criterios de aceptación

- La app puede registrar datos sin internet.
- Las operaciones pendientes se envían al recuperar conexión.
- Una operación repetida no crea duplicados.
- `business-service` valida las reglas financieras.
- La app descarga cambios mediante cursor.
- Los datos anulados también se sincronizan.
- Los conflictos no se resuelven silenciosamente.
- PostgreSQL conserva la idempotencia definitiva.
- Redis no es fuente de verdad.
