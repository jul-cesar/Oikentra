# 09 - Contratos de API de Negocios

## 1. Objetivo

Definir los contratos públicos de `business-service`.

Este servicio administra:

- Negocios.
- Clientes.
- Ventas.
- Gastos.
- Fiados.
- Abonos.
- Anulaciones.
- Historial operativo.

Stack inicial:

```txt
Bun + Hono + Drizzle + PostgreSQL
```

---

## 2. Base URL

```txt
https://api.nombreapp.com/api/business
```

Todas las rutas requieren sesión válida mediante Traefik `ForwardAuth`.

Cabeceras internas:

```http
X-User-Id: user-id
X-Session-Id: session-id
```

---

## 3. Formato de respuesta

Éxito:

```json
{
  "data": {},
  "requestId": "request-id"
}
```

Error:

```json
{
  "code": "ERROR_CODE",
  "message": "Mensaje comprensible.",
  "requestId": "request-id"
}
```

---

# Negocios

## 4. Listar negocios

```http
GET /api/business/businesses
```

Devuelve únicamente los negocios del usuario autenticado.

---

## 5. Crear negocio

```http
POST /api/business/businesses
```

Body:

```json
{
  "name": "Tienda El Progreso",
  "businessType": "STORE",
  "currencyCode": "COP",
  "timezone": "America/Bogota"
}
```

---

## 6. Consultar negocio

```http
GET /api/business/businesses/:businessId
```

---

## 7. Actualizar negocio

```http
PATCH /api/business/businesses/:businessId
```

Body:

```json
{
  "name": "Nuevo nombre",
  "businessType": "STORE"
}
```

No se modifica el propietario desde este endpoint.

---

# Clientes

## 8. Listar clientes

```http
GET /api/business/businesses/:businessId/customers
```

Filtros:

```txt
search
status
limit
cursor
```

---

## 9. Crear cliente

```http
POST /api/business/businesses/:businessId/customers
```

Body:

```json
{
  "name": "Ana Pérez",
  "phone": "3001234567",
  "notes": "Cliente frecuente"
}
```

---

## 10. Consultar cliente

```http
GET /api/business/businesses/:businessId/customers/:customerId
```

Respuesta conceptual:

```json
{
  "data": {
    "id": "customer-id",
    "name": "Ana Pérez",
    "phone": "3001234567",
    "totalDebt": 85000,
    "activeCredits": 2
  }
}
```

---

## 11. Actualizar cliente

```http
PATCH /api/business/businesses/:businessId/customers/:customerId
```

---

# Caja

## 12. Registrar venta

```http
POST /api/business/businesses/:businessId/sales
```

Body:

```json
{
  "amount": 25000,
  "category": "GENERAL",
  "note": "Venta mostrador",
  "businessDate": "2026-07-11",
  "occurredAt": "2026-07-11T15:30:00-05:00"
}
```

Reglas:

- `amount` se expresa en pesos enteros.
- Debe ser mayor que cero.
- Crea un movimiento de caja `SALE`.

---

## 13. Registrar gasto

```http
POST /api/business/businesses/:businessId/expenses
```

Body:

```json
{
  "amount": 12000,
  "category": "SUPPLIES",
  "note": "Compra de bolsas",
  "businessDate": "2026-07-11",
  "occurredAt": "2026-07-11T16:00:00-05:00"
}
```

Crea un movimiento de caja `EXPENSE`.

---

## 14. Listar movimientos

```http
GET /api/business/businesses/:businessId/cash-movements
```

Filtros:

```txt
type
status
from
to
limit
cursor
```

---

## 15. Anular movimiento

```http
POST /api/business/businesses/:businessId/cash-movements/:movementId/cancel
```

Body:

```json
{
  "reason": "Registro duplicado"
}
```

No se elimina físicamente.

---

# Fiados

## 16. Crear fiado

```http
POST /api/business/businesses/:businessId/credits
```

Body:

```json
{
  "customerId": "customer-id",
  "amount": 100000,
  "description": "Mercado de la semana",
  "creditDate": "2026-07-11"
}
```

Reglas:

- El cliente pertenece al negocio.
- El monto es mayor que cero.
- No genera entrada de caja.
- El estado inicial es `PENDING`.

---

## 17. Listar fiados

```http
GET /api/business/businesses/:businessId/credits
```

Filtros:

```txt
customerId
status
from
to
limit
cursor
```

---

## 18. Consultar fiado

```http
GET /api/business/businesses/:businessId/credits/:creditId
```

Respuesta conceptual:

```json
{
  "data": {
    "id": "credit-id",
    "customerId": "customer-id",
    "originalAmount": 100000,
    "paidAmount": 40000,
    "remainingAmount": 60000,
    "status": "PENDING"
  }
}
```

---

## 19. Registrar abono

```http
POST /api/business/businesses/:businessId/credits/:creditId/payments
```

Body:

```json
{
  "amount": 40000,
  "paymentDate": "2026-07-11",
  "note": "Abono en efectivo"
}
```

Reglas:

- El monto debe ser mayor que cero.
- No puede superar el saldo.
- Crea un `credit_payment`.
- Crea un movimiento `CREDIT_PAYMENT`.
- Ambas operaciones se ejecutan en una transacción.
- Si el saldo llega a cero, el fiado pasa a `PAID`.

---

## 20. Listar abonos

```http
GET /api/business/businesses/:businessId/credits/:creditId/payments
```

---

## 21. Anular abono

```http
POST /api/business/businesses/:businessId/credits/:creditId/payments/:paymentId/cancel
```

Body:

```json
{
  "reason": "Monto incorrecto"
}
```

Reglas:

- El abono pasa a `CANCELLED`.
- El movimiento de caja asociado también se anula.
- El saldo se recalcula.
- Un fiado pagado puede volver a `PENDING`.

---

## 22. Anular fiado

```http
POST /api/business/businesses/:businessId/credits/:creditId/cancel
```

Body:

```json
{
  "reason": "Registro creado por error"
}
```

Solo puede anularse si no tiene abonos activos.

---

# Historial

## 23. Historial de cliente

```http
GET /api/business/businesses/:businessId/customers/:customerId/history
```

Incluye:

- Fiados.
- Abonos.
- Saldos.
- Fechas.
- Estados.

---

## 24. Idempotencia

Las operaciones creadas por sincronización podrán incluir:

```http
Idempotency-Key: operation-uuid
```

Aplica a:

- Ventas.
- Gastos.
- Fiados.
- Abonos.
- Anulaciones.

La misma clave no debe crear registros duplicados.

---

## 25. Errores principales

| Código | Significado |
|---|---|
| `UNAUTHENTICATED` | No existe sesión válida |
| `BUSINESS_ACCESS_DENIED` | Sin acceso al negocio |
| `BUSINESS_NOT_FOUND` | Negocio inexistente |
| `CUSTOMER_NOT_FOUND` | Cliente inexistente |
| `CREDIT_NOT_FOUND` | Fiado inexistente |
| `PAYMENT_NOT_FOUND` | Abono inexistente |
| `INVALID_AMOUNT` | Monto inválido |
| `PAYMENT_EXCEEDS_BALANCE` | El abono supera el saldo |
| `ALREADY_CANCELLED` | El registro ya está anulado |
| `CREDIT_HAS_ACTIVE_PAYMENTS` | El fiado tiene abonos activos |
| `IDEMPOTENCY_CONFLICT` | La clave ya fue usada con otros datos |

---

## 26. Códigos HTTP

| Código | Uso |
|---:|---|
| 200 | Consulta o actualización correcta |
| 201 | Registro creado |
| 400 | Datos o regla inválida |
| 401 | Sin sesión válida |
| 403 | Sin acceso |
| 404 | Recurso inexistente |
| 409 | Conflicto |
| 422 | No procesable |
| 500 | Error interno |
| 503 | Dependencia no disponible |

---

## 27. Criterios de aceptación

- Un usuario solo consulta sus negocios.
- Cada cliente pertenece a un negocio.
- Venta y gasto afectan la caja.
- Crear un fiado no afecta la caja.
- Registrar un abono reduce deuda y aumenta caja.
- No se permite sobrepago.
- Las anulaciones conservan historial.
- Un abono y su movimiento se crean o anulan juntos.
- Las operaciones sincronizadas son idempotentes.
- Ningún endpoint acepta `userId` del cliente como autoridad.
