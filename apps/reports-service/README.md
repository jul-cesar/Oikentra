# Reports Service

Genera documentos exportables (PDF, CSV y XLSX) a partir de datos de `business-service`. No modifica datos financieros. La descarga requiere una sesión válida y acceso al negocio.

## Desarrollo

Desde la raíz del repositorio:

```sh
pnpm dev:reports
```

O desde este paquete:

```sh
pnpm --filter @oikentra/reports-service dev
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```sh
cp apps/reports-service/.env.example apps/reports-service/.env
```

Requeridas:

- `BUSINESS_SERVICE_URL` — URL de business-service (ej. `http://localhost:3002`).
- `INTERNAL_AUTH_PUBLIC_KEY_B64` — Clave pública base64 para verificar assertions internas.
- `PORT` — Opcional, por defecto `3000`.
- `INTERNAL_AUTH_DEV_BYPASS` — Bypass para desarrollo local.
- `INTERNAL_AUTH_DEV_USER_ID` — User ID ficticio cuando bypass está activo.

## Health checks

- `GET /api/reports/health/live`
- `GET /api/reports/health/ready`

## Validación

```sh
pnpm --filter @oikentra/reports-service typecheck
pnpm --filter @oikentra/reports-service test
```

## Tipos de reporte

| Tipo | Descripción |
|------|-------------|
| `DAILY_SUMMARY` | Resumen de caja del día |
| `WEEKLY_SUMMARY` | Resumen del período seleccionado |
| `PAYMENT_METHODS` | Ventas por cada medio de pago del período |
| `RECEIVABLES` | Fiados por cobrar |
| `AGED_DEBTS` | Fiados antiguos clasificados |
| `CUSTOMER_STATEMENT` | Estado de cuenta de un cliente |
| `MOVEMENT_HISTORY` | Historial de movimientos |

## Endpoint principal

```http
POST /api/reports/businesses/:businessId/generate
```

```json
{
  "reportType": "WEEKLY_SUMMARY",
  "format": "PDF",
  "from": "2026-07-06",
  "to": "2026-07-12"
}
```
