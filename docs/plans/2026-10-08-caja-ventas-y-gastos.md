# Caja: ventas y gastos — Plan de implementación

> **Para agentes de implementación:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Las casillas `- [ ]` registran el avance.

**Estado:** En curso

**Objetivo:** Renombrar la sección visible «Ventas» como «Caja» y dar el mismo protagonismo a ventas y gastos sin dividirlos en módulos independientes.

**Arquitectura:** Se conserva el modelo actual de movimientos de caja y sus contratos. El cambio se limita a navegación, textos, accesos y estados vacíos en web y móvil; las rutas `/ventas`, componentes, consultas y tipos internos permanecen estables para evitar una migración sin beneficio funcional.

**Stack:** Next.js, React, Expo Router, React Native, TypeScript y componentes existentes del proyecto.

**Especificación:** `docs/02-caja-diaria-y-movimientos.md`

## Restricciones globales

- No cambiar APIs, base de datos, tipos de movimiento ni reglas financieras.
- No crear secciones principales separadas para ventas y gastos.
- Mantener las rutas web y móvil actuales con `/ventas`; «Caja» es el nombre visible para el usuario.
- Reutilizar `CreateSaleDialog`, `CreateExpenseDialog` y los filtros existentes.
- No agregar dependencias ni un framework de pruebas para cambios de presentación.
- Usar «Caja» para el área, «Movimientos» para el historial y «Venta»/«Gasto» para las acciones.

## Resultado esperado

1. La navegación principal muestra **Caja**, no **Ventas**, en web y móvil.
2. La pantalla se presenta como **Caja** y explica que administra ventas, gastos y flujo neto.
3. Registrar una venta y registrar un gasto tienen acciones igualmente visibles.
4. El listado se identifica como **Movimientos** y mantiene los filtros **Todos · Ventas · Gastos**.
5. Los accesos desde el resumen llevan a **Caja** sin prometer que abrirán directamente un formulario.
6. La funcionalidad actual y las URLs existentes no cambian.

## Enfoque de revisión

- Un usuario nuevo debe descubrir cómo registrar un gasto sin explorar menús secundarios.
- Los enlaces existentes a `/ventas` deben seguir funcionando después del cambio visual.
- «Caja» no debe sustituir términos contables específicos dentro de métricas como «Ventas del período» o «Gastos del período».
- Los estados vacío, carga y error deben usar el nuevo lenguaje de manera consistente.
- Web y móvil deben presentar la misma estructura conceptual aunque sus componentes sean distintos.

---

### Tarea 1: Actualizar la experiencia web de Caja

**Archivos:**
- Modificar: `apps/web/components/app-sidebar.tsx`
- Modificar: `apps/web/app/dashboard/[businessId]/ventas/page.tsx`
- Modificar: `apps/web/components/dashboard/ventas/ventas-page.tsx`
- Modificar: `apps/web/components/dashboard/business-dashboard.tsx`
- Modificar: `apps/web/components/dashboard/resumen-general/resumen-general-page.tsx`

**Interfaces:**
- Consume: ruta existente `/dashboard/[businessId]/ventas`, `VentasPage`, `CreateSaleDialog` y `CreateExpenseDialog`.
- Produce: una experiencia web denominada «Caja» sin cambios en contratos ni rutas.

- [x] **Paso 1: Cambiar el nombre visible en la navegación**

En `apps/web/components/app-sidebar.tsx`, cambiar únicamente el título del elemento `Ventas` a `Caja`. Conservar su URL e icono actuales.

- [x] **Paso 2: Alinear el encabezado y los estados de la ruta**

En `apps/web/app/dashboard/[businessId]/ventas/page.tsx`, cambiar `Cargando ventas` por `Cargando caja`. Conservar el componente y la ruta actuales.

- [x] **Paso 3: Presentar la pantalla como Caja**

En `apps/web/components/dashboard/ventas/ventas-page.tsx`:

- usar `Caja` como título principal;
- conservar una descripción explícita de ingresos, gastos y flujo;
- identificar el listado con el encabezado `Movimientos`;
- mantener visibles `Nueva venta` y `Nuevo gasto`;
- reemplazar el CTA único del estado vacío por dos acciones: `Registrar venta` abre `CreateSaleDialog` y `Registrar gasto` abre `CreateExpenseDialog`;
- conservar filtros, estadísticas, categorías, medios de pago y anulación sin cambios funcionales.

- [x] **Paso 4: Corregir los accesos desde los resúmenes**

En `apps/web/components/dashboard/business-dashboard.tsx`, cambiar el acceso `Nueva venta` que solo navega a la página por `Ir a caja`.

En `apps/web/components/dashboard/resumen-general/resumen-general-page.tsx`, cambiar la tarjeta de área:

- título: `Caja`;
- descripción: `Ventas, gastos y flujo de caja.`;
- acción: `Ver caja`;
- conservar las métricas específicas de ventas, gastos y flujo neto.

- [ ] **Paso 5: Verificar web**

Ejecutar:

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Resultado esperado: ambos comandos terminan con código `0`.

Comprobación manual:

1. Abrir `/dashboard/{businessId}/ventas`.
2. Confirmar que el menú y el encabezado muestran `Caja`.
3. Confirmar que `Nueva venta` y `Nuevo gasto` abren el formulario correcto.
4. Confirmar que los filtros `Todos`, `Ventas` y `Gastos` siguen funcionando.
5. Confirmar que los enlaces desde los resúmenes mantienen la URL existente y llegan a Caja.

- [x] **Paso 6: Commit**

```bash
git add apps/web/components/app-sidebar.tsx apps/web/app/dashboard/[businessId]/ventas/page.tsx apps/web/components/dashboard/ventas/ventas-page.tsx apps/web/components/dashboard/business-dashboard.tsx apps/web/components/dashboard/resumen-general/resumen-general-page.tsx
git commit -m "feat(web): rename sales area to cash"
```

---

### Tarea 2: Actualizar la experiencia móvil de Caja

**Archivos:**
- Modificar: `apps/mobile/components/dashboard/app-sidebar.tsx`
- Modificar: `apps/mobile/app/(app)/dashboard/[businessId]/ventas.tsx`
- Modificar: `apps/mobile/app/(app)/dashboard/[businessId]/index.tsx`

**Interfaces:**
- Consume: ruta existente `/dashboard/[businessId]/ventas`, `useCreateSale`, `useCreateExpense` y el selector de tipo de movimiento.
- Produce: una experiencia móvil denominada «Caja» con ventas y gastos igualmente explícitos.

- [x] **Paso 1: Cambiar el nombre visible en la navegación móvil**

En `apps/mobile/components/dashboard/app-sidebar.tsx`, cambiar `Ventas` por `Caja`. Conservar el `href` y el icono actuales.

- [x] **Paso 2: Alinear el encabezado y el formulario**

En `apps/mobile/app/(app)/dashboard/[businessId]/ventas.tsx`:

- usar `Caja` como título;
- usar `Ventas y gastos` como contexto visible del módulo;
- cambiar el subtítulo por `Registra ventas y gastos, y revisa todos tus movimientos.`;
- mantener el selector `Venta`/`Gasto`, campos condicionales, historial y filtros actuales;
- cambiar el texto del botón genérico `Guardar` por `Registrar venta` o `Registrar gasto` según el tipo seleccionado.

- [x] **Paso 3: Alinear el acceso desde el resumen móvil**

En `apps/mobile/app/(app)/dashboard/[businessId]/index.tsx`, cambiar `Registrar una venta` por `Ir a caja`, ya que el botón navega a la sección y no abre directamente el formulario.

- [ ] **Paso 4: Verificar móvil**

Ejecutar:

```bash
pnpm --filter @oikentra/mobile typecheck
```

Resultado esperado: el comando termina con código `0`.

Comprobación manual en un viewport móvil:

1. Confirmar que el menú muestra `Caja`.
2. Entrar a Caja y alternar entre `Venta` y `Gasto`.
3. Confirmar que cambia el texto del botón y que la categoría solo aparece para gastos.
4. Registrar un movimiento de cada tipo y confirmar que ambos aparecen en el historial y sus filtros correspondientes.

- [x] **Paso 5: Commit**

```bash
git add apps/mobile/components/dashboard/app-sidebar.tsx apps/mobile/app/(app)/dashboard/[businessId]/ventas.tsx apps/mobile/app/(app)/dashboard/[businessId]/index.tsx
git commit -m "feat(mobile): rename sales area to cash"
```

---

### Tarea 3: Eliminar la pantalla duplicada sin uso

**Archivos:**
- Eliminar: `apps/web/components/dashboard/cash/cash-page.tsx`

**Interfaces:**
- Consume: búsqueda de referencias que confirme que `CashPage` no se importa fuera de su propio archivo.
- Produce: una única implementación activa de la experiencia de caja.

- [x] **Paso 1: Confirmar que `CashPage` continúa sin referencias**

Buscar `CashPage` en `apps/web`. El único resultado esperado es su declaración en `apps/web/components/dashboard/cash/cash-page.tsx`.

- [x] **Paso 2: Eliminar el componente duplicado**

Eliminar `apps/web/components/dashboard/cash/cash-page.tsx`. No mover `VentasPage`: seguirá siendo la implementación conectada a la ruta estable `/ventas`.

- [ ] **Paso 3: Ejecutar la verificación final**

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
pnpm --filter @oikentra/mobile typecheck
```

Resultado esperado: los tres comandos terminan con código `0`.

- [x] **Paso 4: Commit**

```bash
git add -A apps/web/components/dashboard/cash/cash-page.tsx
git commit -m "refactor(web): remove unused cash page"
```

## Criterio de cierre

El plan se considera completado cuando las verificaciones automáticas pasan, las comprobaciones manuales confirman paridad entre web y móvil, y el estado se actualiza a **Completado** tanto aquí como en `docs/plans/README.md`.

## Estado de verificación

La implementación y los commits están completos. Los typechecks web/móvil, las 16 pruebas web, el lint de los archivos modificados y el build web pasan. Quedan pendientes la comprobación manual autenticada y corregir el fallo basal ajeno en `apps/web/components/reui/kanban.tsx:71` para que el lint completo termine con código `0`.
