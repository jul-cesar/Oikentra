# Cartera: fiados y préstamos — Plan de implementación

> **Para agentes de implementación:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Las casillas `- [ ]` registran el avance.

**Estado:** En curso

**Objetivo:** Unificar fiados y préstamos en una experiencia web llamada «Cartera», con un total combinado y desglose por tipo, sin migrar ni fusionar sus entidades, tablas, APIs o reglas financieras.

**Arquitectura:** La unificación será una proyección de lectura en la aplicación web. `CarteraPage` consultará los endpoints existentes de créditos, préstamos y clientes, normalizará ambas obligaciones mediante una unión discriminada y conservará los flujos actuales para crear, abonar, cancelar y consultar detalles. Las rutas antiguas de listado redirigirán a Cartera; las rutas de detalle seguirán estables.

**Stack:** Next.js, React, TanStack Query, TypeScript, Bun Test y componentes existentes del proyecto.

**Especificación:** `docs/03-clientes-fiados-y-abonos.md`, `apps/business-service/src/modules/loans/loans.schemas.ts` y `apps/business-service/src/db/schema.ts`.

## Decisión de producto

- **Cartera** es el concepto visible que agrupa todo el dinero que los clientes deben al negocio.
- **Fiado** es una deuda originada por una venta; no incorpora tasa ni plan de cuotas.
- **Préstamo** es dinero entregado al cliente; incorpora tasa, plazo, frecuencia y cuotas.
- Ambos comparten cliente, saldo pendiente, vencimiento, abonos, historial y cancelación.
- La interfaz se unifica; la persistencia y las reglas permanecen separadas.
- El resumen muestra primero el total combinado y después el desglose de fiados y préstamos.

## Restricciones globales

- No crear una tabla, entidad o API única de deuda.
- No migrar datos existentes.
- No modificar cálculos de intereses, cuotas, abonos, vencimientos ni estados.
- No cambiar las rutas de detalle `/fiados/[customerId]` y `/prestamos/[loanId]`.
- Reutilizar las consultas y diálogos existentes de fiados y préstamos.
- Mantener «Fiado» y «Préstamo» como tipos visibles dentro de Cartera.
- No sumar `customersWithDebt` de ambos módulos como si fueran clientes únicos; una persona puede aparecer en ambos.
- Implementar primero en web. La aplicación móvil conserva «Fiados» hasta contar con soporte funcional de préstamos; esa paridad requiere un plan posterior.

## Resultado esperado

1. El menú web muestra una sola sección **Cartera** en lugar de **Fiados** y **Préstamos**.
2. Cartera muestra el total combinado por cobrar y el desglose de cada tipo.
3. El usuario puede filtrar **Todos · Fiados · Préstamos** y buscar por cliente.
4. Las acciones **Nuevo fiado** y **Nuevo préstamo** permanecen diferenciadas.
5. Cada obligación conserva su detalle y comportamiento actual.
6. Las URLs antiguas de listado redirigen al filtro correspondiente de Cartera.
7. No hay cambios de base de datos ni contratos de escritura.

## Fuera de alcance

- Fusionar tablas, repositorios, servicios o endpoints.
- Cambiar la amortización francesa de préstamos.
- Agregar intereses, cuotas o pagos programados a los fiados.
- Crear una experiencia móvil incompleta que se llame Cartera pero solo muestre fiados.
- Cambiar los reportes contables o movimientos de caja de ambos productos.

## Enfoque de revisión

- Un cliente con fiados y préstamos debe aparecer correctamente en ambos tipos sin duplicar ni alterar sus saldos.
- Un fiado vencido y un préstamo con cuota vencida deben normalizarse como vencidos usando sus reglas actuales.
- Un error en una consulta no debe mostrar un total combinado parcial como si estuviera completo.
- Los enlaces guardados a `/fiados` y `/prestamos` deben seguir llevando a la información equivalente.
- Crear, abonar o cancelar desde Cartera debe invalidar las consultas actuales y actualizar el resumen sin recargar la página.

---

### Tarea 1: Crear la proyección de lectura de Cartera

**Archivos:**
- Crear: `apps/web/components/dashboard/cartera/cartera-model.ts`
- Crear: `apps/web/components/dashboard/cartera/cartera-model.test.ts`

**Interfaces:**
- Consume: `Credit`, `CreditSummary` y `Customer` de `apps/web/lib/fiados-api.ts`; `Loan` y `LoanSummary` de `apps/web/lib/loans-api.ts`.
- Produce:
  - `PortfolioType = "CREDIT" | "LOAN"`
  - `PortfolioStatus = "ACTIVE" | "OVERDUE" | "PAID" | "CANCELLED"`
  - `PortfolioItem`
  - `PortfolioSummary`
  - `buildPortfolioItems(credits, loans, customers, today)`
  - `buildPortfolioSummary(creditSummary, loanSummary)`

`PortfolioItem` debe incluir: `id`, `type`, `customerId`, `customerName`, `originalAmount`, `remainingAmount`, `startDate`, `dueDate`, `status`, `detailHref`; los campos exclusivos del préstamo (`interestRate`, `installmentAmount`, `frequency`) son opcionales.

`PortfolioSummary` debe incluir: `totalDebt`, `creditDebt`, `loanDebt`, `creditCustomers`, `loanCustomers`, `oldCredits` y `overdueLoans`. No debe producir un total combinado de clientes.

<<<<<<< HEAD
- [ ] **Paso 1: Escribir pruebas fallidas para la normalización**
=======
- [x] **Paso 1: Escribir pruebas fallidas para la normalización**
>>>>>>> feature/cartera-fiados-prestamos

Cubrir como mínimo:

- un crédito `PENDING` sin mora se convierte en fiado `ACTIVE`;
- un crédito `PENDING` con `dueDate` anterior a `today` y saldo pendiente se convierte en `OVERDUE`;
- un préstamo `DEFAULT` o con alguna cuota `OVERDUE` se convierte en `OVERDUE`;
- estados pagados y cancelados se conservan;
- los enlaces resultantes usan `/fiados/{customerId}` para fiados y `/prestamos/{loanId}` para préstamos;
- el total combinado es `creditSummary.totalDebt + loanSummary.totalDebt` y mantiene ambos desgloses.

<<<<<<< HEAD
- [ ] **Paso 2: Ejecutar las pruebas para comprobar que fallan**
=======
- [x] **Paso 2: Ejecutar las pruebas para comprobar que fallan**
>>>>>>> feature/cartera-fiados-prestamos

```bash
cd apps/web && bun test components/dashboard/cartera/cartera-model.test.ts
```

Resultado esperado: falla porque `cartera-model.ts` todavía no implementa las interfaces.

<<<<<<< HEAD
- [ ] **Paso 3: Implementar la proyección mínima**

Implementar las firmas definidas en `cartera-model.ts` sin modificar los tipos originales ni duplicar reglas financieras. Usar `today` como argumento para que la clasificación de vencimientos sea determinista.

- [ ] **Paso 4: Ejecutar las pruebas para comprobar que pasan**
=======
- [x] **Paso 3: Implementar la proyección mínima**

Implementar las firmas definidas en `cartera-model.ts` sin modificar los tipos originales ni duplicar reglas financieras. Usar `today` como argumento para que la clasificación de vencimientos sea determinista.

- [x] **Paso 4: Ejecutar las pruebas para comprobar que pasan**
>>>>>>> feature/cartera-fiados-prestamos

```bash
cd apps/web && bun test components/dashboard/cartera/cartera-model.test.ts
```

Resultado esperado: todas las pruebas pasan.

<<<<<<< HEAD
- [ ] **Paso 5: Commit**
=======
- [x] **Paso 5: Commit**
>>>>>>> feature/cartera-fiados-prestamos

```bash
git add apps/web/components/dashboard/cartera/cartera-model.ts apps/web/components/dashboard/cartera/cartera-model.test.ts
git commit -m "feat(web): add portfolio read model"
```

---

### Tarea 2: Crear la pantalla unificada de Cartera

**Archivos:**
- Crear: `apps/web/components/dashboard/cartera/cartera-page.tsx`
- Crear: `apps/web/app/dashboard/[businessId]/cartera/page.tsx`

**Interfaces:**
- Consume: `useCustomers`, `useCredits`, `useCreditSummary`, `useLoans`, `useLoanSummary`, `buildPortfolioItems`, `buildPortfolioSummary`, `CreateCreditDialog` y `CreateLoanDialog`.
- Produce: ruta `/dashboard/[businessId]/cartera` y filtros por query string `?tipo=fiados|prestamos`.

<<<<<<< HEAD
- [ ] **Paso 1: Crear el contenedor de ruta**

Seguir el patrón de autenticación, carga de negocio y `DashboardShell` de las rutas actuales. El estado de carga debe decir `Cargando cartera`.

- [ ] **Paso 2: Crear el encabezado y las acciones**
=======
- [x] **Paso 1: Crear el contenedor de ruta**

Seguir el patrón de autenticación, carga de negocio y `DashboardShell` de las rutas actuales. El estado de carga debe decir `Cargando cartera`.

- [x] **Paso 2: Crear el encabezado y las acciones**
>>>>>>> feature/cartera-fiados-prestamos

Mostrar:

- contexto: `Control de cartera`;
- título: `Cartera`;
- descripción: `Fiados y préstamos pendientes de tus clientes.`;
- acciones: `Nuevo fiado` y `Nuevo préstamo`, cada una abriendo su diálogo existente.

<<<<<<< HEAD
- [ ] **Paso 3: Crear el resumen combinado**
=======
- [x] **Paso 3: Crear el resumen combinado**
>>>>>>> feature/cartera-fiados-prestamos

Mostrar una tarjeta principal `Total por cobrar` con `summary.totalDebt` y dos tarjetas de desglose:

- `Fiados`: saldo, clientes con deuda y deudas antiguas;
- `Préstamos`: saldo, clientes con deuda y préstamos vencidos.

No mostrar un número combinado de clientes.

<<<<<<< HEAD
- [ ] **Paso 4: Crear búsqueda, filtros y listado**
=======
- [x] **Paso 4: Crear búsqueda, filtros y listado**
>>>>>>> feature/cartera-fiados-prestamos

Agregar:

- filtros `Todos`, `Fiados` y `Préstamos`;
- búsqueda por nombre del cliente;
- orden predeterminado por mayor saldo pendiente;
- distintivo visible del tipo en cada fila;
- monto original, saldo, vencimiento y estado;
- interés y cuota únicamente para préstamos;
- enlace al detalle estable de cada obligación.

El query string `tipo=fiados` selecciona Fiados, `tipo=prestamos` selecciona Préstamos y cualquier otro valor selecciona Todos.

<<<<<<< HEAD
- [ ] **Paso 5: Manejar carga, error y estado vacío**
=======
- [x] **Paso 5: Manejar carga, error y estado vacío**
>>>>>>> feature/cartera-fiados-prestamos

No renderizar saldos hasta que todas las consultas requeridas estén completas. Ante cualquier error, mostrar un único estado de error con `Reintentar` que vuelva a solicitar clientes, créditos, préstamos y ambos resúmenes.

El estado vacío debe mantener visibles `Nuevo fiado` y `Nuevo préstamo`.

- [ ] **Paso 6: Verificar la pantalla**

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Resultado esperado: ambos comandos terminan con código `0`.

Comprobación manual:

1. Comparar el total combinado con la suma de los resúmenes actuales.
2. Verificar los tres filtros y la búsqueda.
3. Abrir ambos formularios y crear una obligación de cada tipo.
4. Abrir el detalle de un fiado y de un préstamo.
5. Simular el fallo de una consulta y confirmar que no aparece un resumen parcial.

<<<<<<< HEAD
- [ ] **Paso 7: Commit**
=======
- [x] **Paso 7: Commit**
>>>>>>> feature/cartera-fiados-prestamos

```bash
git add apps/web/components/dashboard/cartera apps/web/app/dashboard/[businessId]/cartera/page.tsx
git commit -m "feat(web): add unified portfolio page"
```

---

### Tarea 3: Unificar navegación y accesos web

**Archivos:**
- Modificar: `apps/web/components/app-sidebar.tsx`
- Modificar: `apps/web/components/dashboard/dashboard/dashboard-page.tsx`
- Modificar: `apps/web/components/dashboard/resumen-general/resumen-general-page.tsx`
- Modificar: `apps/web/components/dashboard/fiados/customer-detail.tsx`
- Modificar: `apps/web/components/dashboard/prestamos/loan-detail.tsx`

**Interfaces:**
- Consume: ruta `/dashboard/[businessId]/cartera` creada en la Tarea 2.
- Produce: una sola entrada principal y retornos consistentes hacia Cartera.

<<<<<<< HEAD
- [ ] **Paso 1: Reemplazar las entradas del menú**

En `apps/web/components/app-sidebar.tsx`, reemplazar las entradas independientes `Fiados` y `Préstamos` por una sola entrada `Cartera` que apunte a `${base}/cartera`. No modificar `Clientes`.

- [ ] **Paso 2: Actualizar accesos desde Dashboard**

En `apps/web/components/dashboard/dashboard/dashboard-page.tsx`, cambiar el enlace `Ver cartera completa` para que apunte a `/dashboard/${businessId}/cartera`. Conservar las métricas actuales.

- [ ] **Paso 3: Unificar el resumen general**
=======
- [x] **Paso 1: Reemplazar las entradas del menú**

En `apps/web/components/app-sidebar.tsx`, reemplazar las entradas independientes `Fiados` y `Préstamos` por una sola entrada `Cartera` que apunte a `${base}/cartera`. No modificar `Clientes`.

- [x] **Paso 2: Actualizar accesos desde Dashboard**

En `apps/web/components/dashboard/dashboard/dashboard-page.tsx`, cambiar el enlace `Ver cartera completa` para que apunte a `/dashboard/${businessId}/cartera`. Conservar las métricas actuales.

- [x] **Paso 3: Unificar el resumen general**
>>>>>>> feature/cartera-fiados-prestamos

En `apps/web/components/dashboard/resumen-general/resumen-general-page.tsx`:

- representar fiados y préstamos dentro de una sola tarjeta `Cartera`;
- usar `summary.kpis.totalDebt + summary.kpis.loanDebt` como total por cobrar;
- mostrar filas separadas `Fiados`, `Préstamos`, `Deudas antiguas` y `Préstamos vencidos`;
- usar `Ver cartera` como acción y enlazar a `/cartera`;
- no alterar la tarjeta ni las métricas de Caja.

<<<<<<< HEAD
- [ ] **Paso 4: Actualizar retornos desde detalles**
=======
- [x] **Paso 4: Actualizar retornos desde detalles**
>>>>>>> feature/cartera-fiados-prestamos

Cambiar únicamente los enlaces de regreso:

- detalle de fiado → `/cartera?tipo=fiados`;
- detalle de préstamo → `/cartera?tipo=prestamos`.

No modificar acciones, pagos, cancelaciones ni cálculos dentro de los detalles.

- [ ] **Paso 5: Verificar navegación**

Ejecutar:

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Resultado esperado: ambos comandos terminan con código `0`.

Comprobación manual: recorrer menú → Cartera → detalle → regreso para ambos tipos y confirmar que el filtro correspondiente se conserva.

<<<<<<< HEAD
- [ ] **Paso 6: Commit**
=======
- [x] **Paso 6: Commit**
>>>>>>> feature/cartera-fiados-prestamos

```bash
git add apps/web/components/app-sidebar.tsx apps/web/components/dashboard/dashboard/dashboard-page.tsx apps/web/components/dashboard/resumen-general/resumen-general-page.tsx apps/web/components/dashboard/fiados/customer-detail.tsx apps/web/components/dashboard/prestamos/loan-detail.tsx
git commit -m "feat(web): unify debt navigation under portfolio"
```

---

### Tarea 4: Mantener compatibilidad y retirar listados duplicados

**Archivos:**
- Modificar: `apps/web/app/dashboard/[businessId]/fiados/page.tsx`
- Modificar: `apps/web/app/dashboard/[businessId]/prestamos/page.tsx`
- Modificar: `apps/web/app/dashboard/[businessId]/creditos/page.tsx`
- Eliminar: `apps/web/components/dashboard/fiados/fiados-page.tsx`
- Eliminar: `apps/web/components/dashboard/prestamos/prestamos-page.tsx`
- Eliminar si quedan sin referencias: `apps/web/components/dashboard/creditos/`

**Interfaces:**
- Consume: `/cartera?tipo=fiados|prestamos`.
- Produce: compatibilidad para enlaces antiguos sin mantener tres listados equivalentes.

<<<<<<< HEAD
- [ ] **Paso 1: Convertir rutas antiguas en redirecciones**
=======
- [x] **Paso 1: Convertir rutas antiguas en redirecciones**
>>>>>>> feature/cartera-fiados-prestamos

Redirigir:

- `/fiados` → `/cartera?tipo=fiados`;
- `/creditos` → `/cartera?tipo=fiados`;
- `/prestamos` → `/cartera?tipo=prestamos`.

Conservar las rutas de detalle bajo `/fiados/[customerId]` y `/prestamos/[loanId]`.

<<<<<<< HEAD
- [ ] **Paso 2: Verificar referencias antes de eliminar**

Confirmar que `FiadosPage`, `PrestamosPage` y los componentes de `components/dashboard/creditos/` ya no se importan desde rutas activas. Los diálogos ubicados en `fiados/` y `prestamos/` sí se conservan porque Cartera los reutiliza.

- [ ] **Paso 3: Eliminar solo los listados sin uso**

Eliminar `fiados-page.tsx`, `prestamos-page.tsx` y el directorio duplicado `creditos/` únicamente después de que la búsqueda del Paso 2 confirme cero consumidores.

- [ ] **Paso 4: Ejecutar la verificación final**
=======
- [x] **Paso 2: Verificar referencias antes de eliminar**

Confirmar que `FiadosPage`, `PrestamosPage` y los componentes de `components/dashboard/creditos/` ya no se importan desde rutas activas. Los diálogos ubicados en `fiados/` y `prestamos/` sí se conservan porque Cartera los reutiliza.

- [x] **Paso 3: Eliminar solo los listados sin uso**

Eliminar `fiados-page.tsx`, `prestamos-page.tsx` y el directorio duplicado `creditos/` únicamente después de que la búsqueda del Paso 2 confirme cero consumidores.

- [x] **Paso 4: Ejecutar la verificación final**
>>>>>>> feature/cartera-fiados-prestamos

```bash
cd apps/web && bun test components/dashboard/cartera/cartera-model.test.ts
cd ../.. && pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Resultado esperado: pruebas, tipos y lint terminan con código `0`.

- [ ] **Paso 5: Verificar compatibilidad manual**

Abrir directamente las tres URLs antiguas y confirmar que llegan a Cartera con el filtro esperado. Después, abrir ambos tipos de detalle y completar un abono de prueba.

<<<<<<< HEAD
- [ ] **Paso 6: Commit**
=======
- [x] **Paso 6: Commit**
>>>>>>> feature/cartera-fiados-prestamos

```bash
git add -A apps/web/app/dashboard/[businessId] apps/web/components/dashboard/fiados apps/web/components/dashboard/prestamos apps/web/components/dashboard/creditos
git commit -m "refactor(web): retire separate debt listings"
```

## Criterio de cierre

El plan se considera completado cuando Cartera reemplaza los listados separados en la navegación web, los totales coinciden con los resúmenes actuales, los flujos de fiados y préstamos mantienen su comportamiento, las rutas antiguas redirigen correctamente y el estado se actualiza a **Completado** aquí y en `docs/plans/README.md`.
