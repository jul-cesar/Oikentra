# 11 - Contratos de API de Reportes

## 1. Objetivo

`reports-service` generará archivos en el backend y enviará sus bytes al cliente para:

- Previsualizar.
- Descargar.
- Compartir.
- Guardar localmente.

Los resúmenes rápidos de pantalla podrán seguir siendo JSON desde `business-service`.  
`reports-service` se enfocará en documentos exportables.

Stack inicial:

```txt
Bun + Hono + PostgreSQL + Redis
```

---

## 2. Base URL

```txt
https://api.nombreapp.com/api/reports
```

Todas las rutas requieren sesión válida mediante Traefik `ForwardAuth`.

---

## 3. Formatos iniciales

```txt
PDF
CSV
XLSX
```

Para el MVP se recomienda iniciar con:

```txt
PDF
CSV
```

---

## 4. Generar reporte

```http
POST /api/reports/businesses/:businessId/generate
```

Body:

```json
{
  "reportType": "WEEKLY_SUMMARY",
  "format": "PDF",
  "from": "2026-07-06",
  "to": "2026-07-12",
  "customerId": null
}
```

Tipos iniciales:

```txt
DAILY_SUMMARY
WEEKLY_SUMMARY
RECEIVABLES
AGED_DEBTS
CUSTOMER_STATEMENT
MOVEMENT_HISTORY
```

---

## 5. Respuesta en bytes

El backend responde directamente con el archivo.

Ejemplo PDF:

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="reporte-semanal-2026-07-12.pdf"
Content-Length: 184392
X-Report-Id: report-id
X-Request-Id: request-id
```

Body:

```txt
<bytes del archivo PDF>
```

Ejemplo CSV:

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="cuentas-por-cobrar.csv"
```

Ejemplo XLSX:

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="historial.xlsx"
```

---

## 6. Previsualización y descarga

El mismo archivo puede servir para ambas acciones.

### Previsualizar

El cliente guarda temporalmente los bytes y abre el archivo con un visor compatible.

Para PDF:

```txt
Content-Disposition: inline
```

### Descargar

El cliente guarda los bytes en una ubicación seleccionada o comparte el archivo.

Para descarga:

```txt
Content-Disposition: attachment
```

La app móvil decidirá si previsualiza, guarda o comparte el archivo recibido.

---

## 7. Parámetro de disposición

Opcionalmente el cliente podrá indicar:

```json
{
  "disposition": "INLINE"
}
```

Valores:

```txt
INLINE
ATTACHMENT
```

Esto solo modifica el header `Content-Disposition`; no cambia el contenido del reporte.

---

## 8. Generación síncrona

Para reportes pequeños:

```txt
Solicitud
  ↓
Backend consulta datos
  ↓
Genera archivo
  ↓
Devuelve bytes
```

Se usará inicialmente para:

- Resumen diario.
- Resumen semanal.
- Estado de cuenta de un cliente.
- Cuentas por cobrar pequeñas.

---

## 9. Generación asíncrona futura

Para reportes grandes:

```http
POST /api/reports/businesses/:businessId/jobs
```

Respuesta:

```http
HTTP/1.1 202 Accepted
```

```json
{
  "data": {
    "reportId": "report-id",
    "status": "PROCESSING"
  },
  "requestId": "request-id"
}
```

Consulta de estado:

```http
GET /api/reports/jobs/:reportId
```

Descarga:

```http
GET /api/reports/jobs/:reportId/file
```

Redis podrá utilizarse para la cola, pero el estado definitivo debe persistirse.

---

## 10. Fuente de datos

Durante el MVP:

```txt
reports-service → business-service
```

`reports-service` solicitará los datos mediante endpoints internos.

Ejemplo:

```http
POST /internal/reports/data
```

No escribirá directamente en la base de `business-service`.

---

## 11. Cache

Redis podrá almacenar temporalmente archivos o resultados ya generados.

Ejemplo:

```txt
report:{businessId}:{type}:{parametersHash}
```

Reglas:

- TTL limitado.
- Redis no es fuente de verdad.
- El reporte debe poder regenerarse.
- No cachear documentos con datos desactualizados sin una estrategia de invalidación.

---

## 12. Errores

Los errores se devuelven como JSON, no como archivo.

Ejemplo:

```json
{
  "code": "REPORT_GENERATION_FAILED",
  "message": "No fue posible generar el reporte.",
  "requestId": "request-id"
}
```

Códigos principales:

| Código | Significado |
|---|---|
| `INVALID_REPORT_TYPE` | Tipo no soportado |
| `INVALID_REPORT_FORMAT` | Formato no soportado |
| `INVALID_DATE_RANGE` | Fechas inválidas |
| `BUSINESS_ACCESS_DENIED` | Sin acceso al negocio |
| `REPORT_GENERATION_FAILED` | Error generando el archivo |
| `DEPENDENCY_UNAVAILABLE` | Servicio requerido no disponible |

---

## 13. Códigos HTTP

| Código | Uso |
|---:|---|
| 200 | Archivo generado |
| 202 | Generación asíncrona aceptada |
| 400 | Parámetros inválidos |
| 401 | Sin sesión |
| 403 | Sin acceso |
| 404 | Recurso inexistente |
| 422 | Reporte no procesable |
| 500 | Error generando el archivo |
| 503 | Dependencia no disponible |

---

## 14. Criterios de aceptación

- El reporte se genera completamente en el backend.
- El cliente recibe bytes, no HTML ni una ruta interna del servidor.
- La respuesta incluye `Content-Type`.
- La respuesta incluye `Content-Disposition`.
- El archivo puede previsualizarse o descargarse.
- Los errores se devuelven en JSON.
- `reports-service` no modifica datos financieros.
- Redis no es fuente de verdad.
