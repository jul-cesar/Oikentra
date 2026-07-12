# 04 - Reportes, Resúmenes e Historial

## Estado del documento

**Módulo:** Reportes, resúmenes e historial  
**Estado:** Borrador inicial  
**Proyecto:** Aplicación móvil para gestión básica de pequeños negocios  
**Metodología:** Spec Driven Development (SDD)  
**Documento anterior:** `03-clientes-fiados-y-abonos.md`  
**Documento siguiente sugerido:** `05-modo-offline-y-sincronizacion.md`

---

# Parte 1: Enfoque funcional / no técnico

## 1. Propósito del módulo

Este módulo permite que el usuario entienda de forma sencilla cómo se está moviendo su negocio.

El objetivo no es mostrar contabilidad compleja, sino responder preguntas prácticas:

- ¿Cuánto dinero entró hoy?
- ¿Cuánto dinero salió hoy?
- ¿Cuánto dinero quedó?
- ¿Cuánto me deben en total?
- ¿Quiénes me deben?
- ¿Qué deudas llevan más tiempo?
- ¿Qué movimientos he registrado?
- ¿Cómo estuvo mi negocio esta semana?

La aplicación debe presentar esta información con lenguaje claro, números grandes, colores simples y sin términos contables avanzados.

---

## 2. Alcance funcional

El usuario podrá consultar información de un negocio seleccionado.

El módulo incluirá:

- Resumen del día.
- Resumen semanal básico.
- Total por cobrar.
- Deudas antiguas.
- Historial de movimientos.
- Historial de fiados y abonos.
- Historial por cliente.
- Filtros simples por fecha o tipo de movimiento.

---

## 3. Fuera de alcance inicial

En el MVP no se incluirán:

- Estados financieros formales.
- Balance general.
- Estado de resultados.
- Reportes tributarios.
- Exportación contable.
- Gráficas complejas.
- Comparaciones avanzadas entre meses.
- Predicciones de ventas.
- Inteligencia artificial.
- Reportes para bancos o entidades de crédito.
- Dashboard web administrativo.

---

## 4. Principios del módulo

### 4.1 Lenguaje simple

La aplicación debe usar palabras que el usuario entienda.

Usar:

- Entró
- Salió
- Quedó
- Me deben
- Pagaron
- Gasté
- Vendí
- Fiado
- Abono

Evitar:

- Utilidad neta
- Flujo de caja operativo
- Activo
- Pasivo
- Cuentas por cobrar
- Balance
- Estado financiero
- Débito
- Crédito

---

### 4.2 No prometer ganancia real

La aplicación no debe decir que calcula la ganancia real del negocio si no maneja inventario, costos por producto o márgenes.

En el MVP se mostrará:

> Entró - Salió = Quedó

No se mostrará:

> Ganancia neta

Ejemplo correcto:

```txt
Hoy entró: $120.000
Hoy salió: $45.000
Hoy quedó: $75.000
```

Ejemplo que se debe evitar:

```txt
Tu ganancia neta fue de $75.000
```

---

### 4.3 Información por negocio

Todos los reportes se calculan únicamente sobre el negocio seleccionado.

Si el usuario tiene varios negocios, los datos no deben mezclarse.

Ejemplo:

```txt
Usuario: Ana
Negocios:
- Tienda La 20
- Puesto de comidas

Si Ana entra a "Tienda La 20", solo ve reportes de "Tienda La 20".
```

---

### 4.4 Claridad sobre fiados

Los fiados nuevos no son dinero recibido.

Por eso:

- Un fiado aumenta el total por cobrar.
- Un fiado no aumenta el dinero que entró hoy.
- Un abono sí aumenta el dinero que entró hoy.

Ejemplo:

```txt
Pedro compra $20.000 fiado.

Entró hoy: $0
Me deben: $20.000
```

Si luego Pedro abona $5.000:

```txt
Entró hoy: $5.000
Pedro queda debiendo: $15.000
```

---

## 5. Reportes principales

## 5.1 Resumen del día

El resumen del día muestra la situación básica de caja para una fecha específica.

Debe mostrar:

- Total que entró.
- Total que salió.
- Diferencia.
- Cantidad de ventas registradas.
- Cantidad de gastos registrados.
- Abonos recibidos.
- Fiados nuevos del día.

### Ejemplo visual

```txt
Resumen de hoy

Entró: $150.000
Salió: $60.000
Quedó: $90.000

Ventas de contado: $120.000
Abonos recibidos: $30.000
Gastos: $60.000
Fiados nuevos: $45.000
```

---

## 5.2 Resumen semanal

El resumen semanal muestra una vista básica de los últimos 7 días o de la semana actual.

Debe mostrar:

- Total que entró en la semana.
- Total que salió en la semana.
- Diferencia de la semana.
- Día con más entradas.
- Total fiado durante la semana.
- Total abonado durante la semana.

### Ejemplo

```txt
Resumen de la semana

Entró: $820.000
Salió: $410.000
Quedó: $410.000

Día con más entradas: sábado
Fiado registrado: $130.000
Abonos recibidos: $85.000
```

---

## 5.3 Total por cobrar

El total por cobrar muestra cuánto dinero le deben al negocio.

Debe calcularse con los fiados activos menos los abonos registrados.

### Ejemplo

```txt
Total por cobrar: $245.000
Clientes con deuda: 8
Deudas antiguas: 3
```

---

## 5.4 Deudas antiguas

La aplicación debe mostrar las deudas que llevan varios días sin pagarse.

Para MVP se propone esta clasificación:

```txt
0 a 7 días: reciente
8 a 15 días: pendiente
Más de 15 días: antigua
```

Opcionalmente, se puede usar una clasificación más fuerte:

```txt
0 a 7 días: verde
8 a 15 días: amarillo
Más de 30 días: rojo
```

Esta configuración puede quedar fija en el MVP y ser configurable en versiones futuras.

---

## 5.5 Historial de movimientos

El historial permite revisar ventas, gastos y abonos recibidos.

Debe permitir ver:

- Fecha.
- Tipo de movimiento.
- Monto.
- Nota.
- Categoría, si aplica.
- Estado: activo o anulado.

Tipos de movimientos:

- Venta.
- Gasto.
- Abono de fiado.

---

## 5.6 Historial de fiados

El historial de fiados permite revisar las deudas registradas.

Debe mostrar:

- Cliente.
- Monto inicial del fiado.
- Saldo pendiente.
- Fecha.
- Estado: pendiente, pagado o cancelado.
- Días desde que se registró.

---

## 5.7 Historial por cliente

Desde un cliente, el usuario podrá ver:

- Fiados pendientes.
- Fiados pagados.
- Abonos realizados.
- Total que debe.
- Fecha del último abono.
- Deudas antiguas del cliente.

---

## 6. Requisitos funcionales

### RF-001: Ver resumen del día

El sistema debe permitir al usuario ver el resumen de caja de un negocio para el día actual.

El resumen debe mostrar:

- Total de entradas.
- Total de salidas.
- Diferencia.
- Ventas de contado.
- Abonos recibidos.
- Gastos.
- Fiados nuevos del día.

---

### RF-002: Cambiar fecha del resumen diario

El sistema debe permitir consultar el resumen de otros días.

Ejemplo:

```txt
Hoy
Ayer
Seleccionar fecha
```

---

### RF-003: Ver resumen semanal

El sistema debe permitir consultar un resumen básico de la semana.

Debe incluir:

- Entradas de la semana.
- Salidas de la semana.
- Diferencia.
- Fiados registrados.
- Abonos recibidos.
- Día con mayor entrada de dinero.

---

### RF-004: Ver total por cobrar

El sistema debe mostrar el total pendiente por cobrar del negocio.

El cálculo debe tomar en cuenta:

- Fiados pendientes.
- Abonos válidos.
- Fiados cancelados excluidos.
- Abonos cancelados excluidos.

---

### RF-005: Ver deudas antiguas

El sistema debe mostrar una lista de fiados antiguos.

La lista debe permitir identificar:

- Cliente.
- Monto pendiente.
- Fecha del fiado.
- Días transcurridos.
- Estado visual de alerta.

---

### RF-006: Ver historial de movimientos

El sistema debe permitir consultar ventas, gastos y abonos registrados.

El historial debe permitir filtrar por:

- Fecha.
- Tipo de movimiento.
- Estado.

---

### RF-007: Ver historial de fiados

El sistema debe permitir consultar fiados registrados.

El historial debe permitir filtrar por:

- Cliente.
- Estado.
- Fecha.
- Antigüedad.

---

### RF-008: Ver historial por cliente

El sistema debe permitir abrir un cliente y ver su historial financiero dentro del negocio.

---

### RF-009: Actualizar reportes después de registrar información

Cuando el usuario registre una venta, gasto, fiado o abono, los reportes deben reflejar el cambio.

---

### RF-010: Mostrar mensajes vacíos

Si no hay información, el sistema debe mostrar mensajes claros.

Ejemplos:

```txt
Aún no has registrado ventas hoy.
Aún no tienes clientes con fiados.
No hay gastos registrados en esta fecha.
```

---

## 7. Requisitos no funcionales

### RNF-001: Rapidez

Los reportes principales deben cargar rápido, incluso en dispositivos Android de gama baja.

---

### RNF-002: Simplicidad visual

Los reportes deben priorizar claridad sobre detalle.

No deben saturar al usuario con demasiadas cifras.

---

### RNF-003: Funcionamiento offline

Los reportes deben poder calcularse con la información disponible en SQLite, sin depender de internet.

---

### RNF-004: Consistencia

Los reportes deben mostrar los mismos resultados si se calculan desde SQLite o desde PostgreSQL, siempre que los datos estén sincronizados.

---

### RNF-005: Separación por negocio

Los reportes deben consultar únicamente datos del negocio activo.

---

### RNF-006: Lenguaje comprensible

Los textos deben poder ser entendidos por usuarios sin conocimientos contables.

---

## 8. Reglas de negocio

### BR-001: Reportes por negocio

Todo reporte debe calcularse usando `businessId`.

```txt
Si no hay negocio activo, no se puede consultar reporte.
```

---

### BR-002: Entradas del día

Las entradas del día se calculan con:

```txt
Ventas de contado activas
+
Abonos de fiado activos
```

No se incluyen:

- Fiados nuevos.
- Movimientos anulados.
- Gastos.

---

### BR-003: Salidas del día

Las salidas del día se calculan con:

```txt
Gastos activos
```

No se incluyen:

- Ventas.
- Abonos.
- Movimientos anulados.

---

### BR-004: Diferencia del día

La diferencia del día se calcula así:

```txt
diferencia = entradas - salidas
```

La aplicación debe llamarlo preferiblemente:

```txt
Quedó
```

---

### BR-005: Fiados nuevos del día

Los fiados nuevos del día se muestran aparte.

No suman a entradas, porque todavía no representan dinero recibido.

---

### BR-006: Abonos recibidos

Los abonos recibidos sí suman a entradas del día.

---

### BR-007: Total por cobrar

El total por cobrar se calcula así:

```txt
totalPorCobrar = suma de saldos pendientes de fiados activos
```

Donde:

```txt
saldoPendiente = montoFiado - sumaAbonosActivos
```

---

### BR-008: Fiados pagados

Un fiado pagado no debe sumarse al total por cobrar.

---

### BR-009: Fiados cancelados

Un fiado cancelado no debe sumarse al total por cobrar.

---

### BR-010: Movimientos anulados

Los movimientos anulados no deben afectar reportes.

---

### BR-011: Abonos anulados

Los abonos anulados no deben reducir la deuda ni sumar como entrada.

---

### BR-012: Fechas

Los reportes se calculan usando la fecha del movimiento, no necesariamente la fecha de creación.

Ejemplo:

```txt
Si hoy registro una venta con fecha de ayer, esa venta aparece en el resumen de ayer.
```

---

### BR-013: Zona horaria

Las fechas deben interpretarse usando la zona horaria del usuario o del dispositivo.

Para Colombia, el comportamiento esperado es usar horario local de Colombia.

---

## 9. Casos de uso

## CU-001: Consultar resumen del día

### Actor

Usuario autenticado con un negocio seleccionado.

### Flujo principal

1. El usuario entra a un negocio.
2. El sistema muestra la pantalla principal del negocio.
3. El usuario ve el resumen del día.
4. El sistema calcula entradas, salidas y diferencia.
5. El sistema muestra también fiados nuevos y abonos recibidos.

### Resultado esperado

El usuario entiende cómo se movió la caja del día.

---

## CU-002: Consultar total por cobrar

### Actor

Usuario autenticado con un negocio seleccionado.

### Flujo principal

1. El usuario entra al módulo de fiados o reportes.
2. El sistema calcula todos los fiados pendientes.
3. El sistema resta los abonos válidos.
4. El sistema muestra el total por cobrar.

### Resultado esperado

El usuario sabe cuánto dinero le deben.

---

## CU-003: Consultar deudas antiguas

### Actor

Usuario autenticado con un negocio seleccionado.

### Flujo principal

1. El usuario entra a la sección de deudas antiguas.
2. El sistema lista fiados pendientes ordenados por antigüedad.
3. El usuario identifica clientes a los que debe cobrar.

### Resultado esperado

El usuario puede priorizar cobros.

---

## CU-004: Revisar historial de movimientos

### Actor

Usuario autenticado con un negocio seleccionado.

### Flujo principal

1. El usuario entra a historial.
2. El sistema muestra movimientos recientes.
3. El usuario puede filtrar por fecha o tipo.
4. El usuario selecciona un movimiento para ver detalle.

### Resultado esperado

El usuario puede revisar lo que registró.

---

## CU-005: Revisar historial de un cliente

### Actor

Usuario autenticado con un negocio seleccionado.

### Flujo principal

1. El usuario abre un cliente.
2. El sistema muestra sus fiados y abonos.
3. El sistema muestra el saldo total pendiente del cliente.

### Resultado esperado

El usuario entiende la situación de deuda de ese cliente.

---

## 10. Casos límite

### CL-001: No hay movimientos en el día

El sistema debe mostrar:

```txt
Aún no has registrado movimientos hoy.
```

No debe mostrar errores ni valores confusos.

---

### CL-002: Hay gastos pero no ventas

Ejemplo:

```txt
Entró: $0
Salió: $30.000
Quedó: -$30.000
```

Debe permitirse.

---

### CL-003: Hay abonos pero no ventas

Ejemplo:

```txt
Entró: $20.000
Salió: $0
Quedó: $20.000
```

Debe permitirse porque el dinero sí entró.

---

### CL-004: Hay fiados nuevos pero no ventas de contado

Ejemplo:

```txt
Fiado registrado: $50.000
Entró: $0
```

El sistema no debe confundir fiado con dinero recibido.

---

### CL-005: Todos los fiados están pagados

El sistema debe mostrar:

```txt
No tienes deudas pendientes.
```

---

### CL-006: Cliente con varios fiados

El total del cliente debe sumar los saldos pendientes de todos sus fiados activos.

---

### CL-007: Datos anulados

Los movimientos, fiados o abonos anulados deben aparecer en historial si se requiere, pero no deben afectar totales.

---

# Parte 2: Enfoque técnico

## 11. Entidades involucradas

Este módulo usa principalmente datos de:

- `Business`
- `CashMovement`
- `Customer`
- `Credit`
- `CreditPayment`

---

## 12. Modelo conceptual

```txt
Business
  ├── CashMovement
  │     ├── SALE
  │     ├── EXPENSE
  │     └── CREDIT_PAYMENT
  │
  ├── Customer
  │     └── Credit
  │           └── CreditPayment
  │
  └── Reports
        ├── DailySummary
        ├── WeeklySummary
        ├── ReceivablesSummary
        └── History
```

---

## 13. CashMovement

Representa movimientos reales de dinero.

```ts
type CashMovementType = "SALE" | "EXPENSE" | "CREDIT_PAYMENT";
type CashMovementStatus = "ACTIVE" | "CANCELLED";

interface CashMovement {
  id: string;
  businessId: string;
  type: CashMovementType;
  amount: number;
  note?: string;
  category?: string;
  movementDate: string;
  status: CashMovementStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: "PENDING" | "SYNCED" | "FAILED";
}
```

---

## 14. Credit

Representa una deuda por fiado.

```ts
type CreditStatus = "PENDING" | "PAID" | "CANCELLED";

interface Credit {
  id: string;
  businessId: string;
  customerId: string;
  amount: number;
  description?: string;
  creditDate: string;
  status: CreditStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: "PENDING" | "SYNCED" | "FAILED";
}
```

---

## 15. CreditPayment

Representa un abono a un fiado.

```ts
type CreditPaymentStatus = "ACTIVE" | "CANCELLED";

interface CreditPayment {
  id: string;
  businessId: string;
  creditId: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  note?: string;
  status: CreditPaymentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: "PENDING" | "SYNCED" | "FAILED";
}
```

---

## 16. Cálculo del resumen diario

```ts
interface DailySummary {
  businessId: string;
  date: string;
  cashSalesTotal: number;
  creditPaymentsTotal: number;
  expensesTotal: number;
  creditCreatedTotal: number;
  totalIn: number;
  totalOut: number;
  remaining: number;
}
```

### Fórmula

```ts
totalIn = cashSalesTotal + creditPaymentsTotal;
totalOut = expensesTotal;
remaining = totalIn - totalOut;
```

---

## 17. Cálculo del total por cobrar

```ts
interface ReceivablesSummary {
  businessId: string;
  totalReceivable: number;
  activeCreditsCount: number;
  customersWithDebtCount: number;
  oldCreditsCount: number;
}
```

### Fórmula

```ts
creditBalance = credit.amount - sum(activePayments.amount);
totalReceivable = sum(creditBalance of active credits);
```

---

## 18. Consulta SQL conceptual para resumen diario

```sql
SELECT
  SUM(CASE WHEN type = 'SALE' THEN amount ELSE 0 END) AS cash_sales_total,
  SUM(CASE WHEN type = 'CREDIT_PAYMENT' THEN amount ELSE 0 END) AS credit_payments_total,
  SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expenses_total
FROM cash_movements
WHERE business_id = :businessId
  AND DATE(movement_date) = :date
  AND status = 'ACTIVE';
```

---

## 19. Consulta SQL conceptual para fiados del día

```sql
SELECT
  SUM(amount) AS credit_created_total
FROM credits
WHERE business_id = :businessId
  AND DATE(credit_date) = :date
  AND status IN ('PENDING', 'PAID');
```

Los fiados cancelados no se incluyen.

---

## 20. Consulta SQL conceptual para total por cobrar

```sql
SELECT
  c.id,
  c.amount - COALESCE(SUM(p.amount), 0) AS pending_balance
FROM credits c
LEFT JOIN credit_payments p
  ON p.credit_id = c.id
  AND p.status = 'ACTIVE'
WHERE c.business_id = :businessId
  AND c.status = 'PENDING'
GROUP BY c.id, c.amount;
```

El total por cobrar se obtiene sumando `pending_balance`.

---

## 21. Endpoints sugeridos

Aunque los reportes deben poder calcularse localmente en SQLite, el backend también puede ofrecer endpoints para reportes remotos.

### Obtener resumen del día

```http
GET /businesses/:businessId/reports/daily?date=2025-01-20
```

### Obtener resumen semanal

```http
GET /businesses/:businessId/reports/weekly?startDate=2025-01-20&endDate=2025-01-26
```

### Obtener total por cobrar

```http
GET /businesses/:businessId/reports/receivables
```

### Obtener deudas antiguas

```http
GET /businesses/:businessId/reports/old-credits
```

### Obtener historial de movimientos

```http
GET /businesses/:businessId/history/movements
```

### Obtener historial de fiados

```http
GET /businesses/:businessId/history/credits
```

### Obtener historial de cliente

```http
GET /businesses/:businessId/customers/:customerId/history
```

---

## 22. Autorización de endpoints

Todos los endpoints deben validar:

1. Que el usuario esté autenticado.
2. Que el negocio exista.
3. Que el negocio pertenezca al usuario o que el usuario tenga permisos sobre él.

Regla:

```txt
Un usuario no puede consultar reportes de negocios ajenos.
```

---

## 23. Consideraciones para SQLite

Los reportes deben poder calcularse desde SQLite.

Esto significa que:

- Las tablas locales deben tener los mismos campos principales que las tablas remotas.
- Los movimientos deben guardarse localmente primero.
- Los reportes deben poder funcionar sin internet.
- Los datos pendientes de sincronización también deben verse reflejados en los reportes locales.

Ejemplo:

```txt
El usuario registra una venta sin internet.
La venta queda en SQLite con syncStatus = PENDING.
El resumen del día debe incluir esa venta inmediatamente.
```

---

## 24. Consideraciones para PostgreSQL

PostgreSQL funcionará como base remota cuando exista sincronización o respaldo.

Los reportes del backend deben calcularse con la misma lógica que los reportes locales.

Esto evita que el usuario vea resultados diferentes entre app y servidor.

---

## 25. Consideraciones con Drizzle

Drizzle debe permitir definir consultas reutilizables para:

- Resumen diario.
- Resumen semanal.
- Total por cobrar.
- Deudas antiguas.
- Historial por negocio.
- Historial por cliente.

Se recomienda centralizar la lógica de reportes en servicios de dominio, no directamente en controladores HTTP.

Ejemplo conceptual:

```txt
reports.service.ts
  ├── getDailySummary()
  ├── getWeeklySummary()
  ├── getReceivablesSummary()
  ├── getOldCredits()
  └── getCustomerHistory()
```

---

## 26. Consideraciones con Hono

Hono expondrá los endpoints protegidos de reportes.

Estructura sugerida:

```txt
src/modules/reports/
  ├── reports.routes.ts
  ├── reports.service.ts
  ├── reports.repository.ts
  └── reports.schemas.ts
```

---

## 27. Validaciones técnicas

- `businessId` debe ser obligatorio.
- `date` debe tener formato válido.
- `startDate` no debe ser mayor que `endDate`.
- El rango de fechas debe tener un límite razonable.
- Los montos deben calcularse excluyendo registros anulados.
- Los reportes deben excluir datos con `deletedAt` cuando aplique.

---

## 28. Criterios de aceptación

### CA-001: Resumen diario correcto

Dado un negocio con:

```txt
Ventas: $100.000
Abonos: $20.000
Gastos: $40.000
Fiados nuevos: $50.000
```

Cuando el usuario consulta el resumen del día,

Entonces debe ver:

```txt
Entró: $120.000
Salió: $40.000
Quedó: $80.000
Fiado nuevo: $50.000
```

---

### CA-002: Fiado nuevo no suma a entradas

Dado que el usuario registra un fiado de $30.000,

Cuando consulta el resumen del día,

Entonces el total de entradas no debe aumentar por ese fiado.

---

### CA-003: Abono sí suma a entradas

Dado que un cliente abona $10.000,

Cuando el usuario consulta el resumen del día,

Entonces las entradas deben aumentar en $10.000.

---

### CA-004: Total por cobrar correcto

Dado un cliente con un fiado de $50.000 y un abono de $15.000,

Cuando se consulta el total por cobrar,

Entonces ese fiado debe aportar $35.000 al total pendiente.

---

### CA-005: Movimientos anulados no afectan reportes

Dado que existe una venta de $20.000 anulada,

Cuando se consulta el resumen del día,

Entonces esa venta no debe sumarse a las entradas.

---

### CA-006: Reportes offline

Dado que el usuario no tiene internet,

Cuando registra una venta y consulta el resumen,

Entonces la venta debe aparecer en el resumen desde SQLite.

---

## 29. Decisiones pendientes

- Definir si el resumen semanal usa semana calendario o últimos 7 días.
- Definir si se permitirá exportar reportes en PDF o Excel en una fase futura.
- Definir si los reportes se mostrarán con gráficas o solo tarjetas simples.
- Definir si las categorías de gastos serán fijas o personalizadas.
- Definir si el usuario podrá configurar los días para considerar una deuda como antigua.
- Definir si se mostrarán comparaciones con semanas anteriores en el MVP.

---

## 30. Definición de terminado

Este módulo se considera terminado cuando:

- El usuario puede ver el resumen del día de un negocio.
- El usuario puede ver el resumen semanal básico.
- El usuario puede ver el total por cobrar.
- El usuario puede ver deudas antiguas.
- El usuario puede revisar historial de movimientos.
- El usuario puede revisar historial por cliente.
- Los reportes funcionan sin internet usando SQLite.
- Los reportes respetan el negocio activo.
- Los reportes excluyen movimientos anulados.
- Los textos usan lenguaje simple.
