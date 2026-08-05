# Reports Service

Genera documentos exportables (PDF/CSV) a partir de datos de `business-service`. No modifica datos financieros.

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

- `DATABASE_URL` — Cadena de conexión PostgreSQL para la base `oikentra_reports`.
- `BUSINESS_SERVICE_URL` — URL base de business-service (ej. `http://localhost:3000`).
- `INTERNAL_AUTH_PUBLIC_KEY_B64` — Clave pública base64 para verificar assertions internas.
- `PORT` — Opcional, por defecto `3000`.
- `INTERNAL_AUTH_DEV_BYPASS` — Bypass para desarrollo local.
- `INTERNAL_AUTH_DEV_USER_ID` — User ID ficticio cuando bypass está activo.

## Health checks

- `GET /api/reports/health/live`
- `GET /api/reports/health/ready`

## Database

```sh
pnpm --filter @oikentra/reports-service db:generate
pnpm --filter @oikentra/reports-service db:migrate
```

## Validación

```sh
pnpm --filter @oikentra/reports-service typecheck
pnpm --filter @oikentra/reports-service test
```

## Tipos de reporte

| Tipo | Descripción |
|------|-------------|
| `DAILY_SUMMARY` | Resumen de caja del día |
| `WEEKLY_SUMMARY` | Resumen semanal de 7 días |
| `RECEIVABLES` | Cuentas por cobrar |
| `AGED_DEBTS` | Deudas antiguas clasificadas |
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
