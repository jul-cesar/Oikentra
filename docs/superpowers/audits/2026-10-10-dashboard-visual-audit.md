# Auditoría visual del dashboard — 2026-10-10

Referencia: Caja (`/dashboard/[businessId]/ventas`). Resoluciones previstas: escritorio 1440 px y móvil 375 px.

| Ruta | Escritorio claro | Escritorio oscuro | Móvil claro | Móvil oscuro | Teclado/foco | Carga/vacío/error | Resultado | Notas |
|---|---|---|---|---|---|---|---|---|
| `/dashboard` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Selector de negocio; excepción de pantalla completa. |
| `/dashboard/[businessId]` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Dashboard principal. |
| `/dashboard/[businessId]/agenda` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Calendario ancho. |
| `/dashboard/[businessId]/cartera` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |
| `/dashboard/[businessId]/clientes` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |
| `/dashboard/[businessId]/configuracion` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Requiere rol con permiso. |
| `/dashboard/[businessId]/creditos` | N/A | N/A | N/A | N/A | N/A | N/A | PASS | Fuente verificada: redirige a `/cartera?tipo=fiados`. |
| `/dashboard/[businessId]/fiados/[customerId]` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Requiere cliente existente. |
| `/dashboard/[businessId]/fiados` | N/A | N/A | N/A | N/A | N/A | N/A | PASS | Fuente verificada: redirige a `/cartera?tipo=fiados`. |
| `/dashboard/[businessId]/perfil` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |
| `/dashboard/[businessId]/prestamos/[loanId]` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Requiere préstamo existente. |
| `/dashboard/[businessId]/prestamos` | N/A | N/A | N/A | N/A | N/A | N/A | PASS | Fuente verificada: redirige a `/cartera?tipo=prestamos`. |
| `/dashboard/[businessId]/resumen-general` | N/A | N/A | N/A | N/A | N/A | N/A | PASS | Fuente verificada: redirige al dashboard principal. |
| `/dashboard/[businessId]/tareas` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |
| `/dashboard/[businessId]/tareas/nueva` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |
| `/dashboard/[businessId]/tareas/[taskId]` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Requiere tarea existente. |
| `/dashboard/[businessId]/ventas` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Referencia canónica. |
| `/dashboard/[businessId]/ventas/categorias` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |
| `/dashboard/[businessId]/ventas/estadisticas` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | — |

## Evidencia

- Tests de fuente: PASS, 29/29.
- TypeScript: PASS.
- Build de producción: PASS.
- ESLint limitado por módulo en las tareas 1–8: PASS.
- ESLint global: BLOCKED por 4 errores previos fuera del alcance en `components/motion/attachment-upload.tsx`, `components/motion/tooltip/positioner.tsx` y `components/motion/tooltip/use-position.ts`.
- Recorrido Playwright autenticado: BLOCKED. El entorno no tiene `playwright` ni `@playwright/test` para Node, ni el módulo Python `playwright`; tampoco se proporcionó una sesión autenticada reutilizable.
- Capturas temporales: no generadas.

## Para desbloquear

Proporcionar un entorno Playwright instalado y una sesión local autenticada no secreta. Después, ejecutar las cuatro variantes visuales, foco por teclado y estados seguros por cada destino marcado `BLOCKED`.
