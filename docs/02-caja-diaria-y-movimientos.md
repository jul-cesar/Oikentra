# 02 - Caja diaria y movimientos

## Estado del documento

**Tipo:** Especificación funcional y técnica  
**Módulo:** Caja diaria y movimientos de dinero  
**Estado:** Borrador inicial  
**Proyecto:** Aplicación móvil para gestión básica de pequeños negocios  
**Metodología:** Spec Driven Development (SDD)

---

# Parte 1: Enfoque funcional / no técnico

## 1. Propósito del módulo

El módulo de caja diaria permite que el usuario registre de forma rápida el dinero que entra y sale de un negocio.

El objetivo no es llevar contabilidad formal, sino responder preguntas simples:

- ¿Cuánto vendí hoy?
- ¿Cuánto gasté hoy?
- ¿Cuánto dinero entró?
- ¿Cuánto dinero salió?
- ¿Cuánto quedó en el día?
- ¿Qué movimientos hice hoy, esta semana o este mes?

Este módulo debe ser fácil de usar, rápido y entendible para personas que no manejan términos contables.

---

## 2. Alcance del módulo

Este módulo incluye:

- Registro de ventas de contado.
- Registro de gastos.
- Consulta del resumen diario.
- Consulta del historial de movimientos.
- Corrección o anulación de movimientos.
- Funcionamiento sin internet usando almacenamiento local.

Este módulo no incluye todavía:

- Inventario.
- Costos por producto.
- Ganancia neta real.
- Facturación electrónica.
- Impuestos.
- Cierre contable formal.
- Reportes avanzados.
- Nómina.

---

## 3. Conceptos principales

### 3.1 Negocio activo

Antes de registrar una venta o un gasto, el usuario debe haber seleccionado un negocio.

Ejemplo:

```txt
Usuario: Carlos
Negocios:
- Tienda La 20
- Puesto de comidas

Negocio activo: Tienda La 20
```

Todas las ventas y gastos registrados en ese momento pertenecen a **Tienda La 20**.

---

### 3.2 Movimiento de caja

Un movimiento de caja representa una entrada o salida de dinero del negocio.

Tipos iniciales:

| Tipo | Significado | Ejemplo |
|---|---|---|
| Venta | Dinero que entra por una venta de contado | Vendí $10.000 |
| Gasto | Dinero que sale del negocio | Compré mercancía por $50.000 |
| Abono de fiado | Dinero que entra porque un cliente pagó parte de una deuda | Pedro abonó $5.000 |

En este documento se detallan principalmente **ventas** y **gastos**. Los abonos se definirán mejor en el documento de clientes, fiados y abonos.

---

## 4. Regla conceptual importante

La caja diaria solo debe representar dinero real que entró o salió.

Por eso:

```txt
Venta de contado = entra dinero a caja
Gasto = sale dinero de caja
Fiado nuevo = NO entra dinero a caja todavía
Abono de fiado = entra dinero a caja
```

Ejemplo:

```txt
Pedro compra $20.000 fiado.

Dinero que entró hoy: $0
Total que me deben: $20.000
```

Cuando Pedro abona:

```txt
Pedro abona $5.000.

Dinero que entró hoy: $5.000
Pedro queda debiendo: $15.000
```

---

## 5. Lenguaje de la aplicación

La aplicación debe usar lenguaje cotidiano.

Usar:

- Venta
- Gasto
- Entró
- Salió
- Quedó
- Hoy
- Esta semana
- Este mes

Evitar:

- Débito
- Crédito
- Activo
- Pasivo
- Utilidad neta
- Estado de resultados
- Balance general
- Cuentas contables

---

## 6. Requisitos funcionales

### RF-CD-001: Registrar venta de contado

El usuario debe poder registrar una venta de contado desde el negocio activo.

Datos mínimos:

- Monto de la venta.
- Fecha y hora automática.

Datos opcionales:

- Nota.

Flujo esperado:

```txt
Usuario entra al negocio
↓
Toca botón "Venta"
↓
Ingresa monto
↓
Opcionalmente escribe nota
↓
Guarda
↓
La venta aparece en el resumen del día y en el historial
```

Criterios de aceptación:

- El monto debe ser mayor que cero.
- La venta debe asociarse al negocio activo.
- La venta debe aumentar el total de entradas del día.
- La venta debe guardarse aunque no haya internet.
- La app debe mostrar confirmación después de guardar.

Mensaje sugerido:

```txt
Venta guardada
```

---

### RF-CD-002: Registrar gasto

El usuario debe poder registrar una salida de dinero del negocio.

Datos mínimos:

- Monto del gasto.
- Categoría.
- Fecha y hora automática.

Datos opcionales:

- Nota.

Categorías iniciales sugeridas:

- Compra de mercancía.
- Servicios.
- Arriendo.
- Transporte / domicilio.
- Pago a empleado.
- Gasto personal.
- Otro.

Flujo esperado:

```txt
Usuario entra al negocio
↓
Toca botón "Gasto"
↓
Ingresa monto
↓
Selecciona categoría
↓
Opcionalmente escribe nota
↓
Guarda
↓
El gasto aparece en el resumen del día y en el historial
```

Criterios de aceptación:

- El monto debe ser mayor que cero.
- El gasto debe asociarse al negocio activo.
- El gasto debe aumentar el total de salidas del día.
- El gasto debe guardarse aunque no haya internet.
- La app debe mostrar confirmación después de guardar.

Mensaje sugerido:

```txt
Gasto guardado
```

---

### RF-CD-003: Ver resumen del día

El usuario debe poder ver un resumen simple del día para el negocio activo.

El resumen debe mostrar:

- Dinero que entró.
- Dinero que salió.
- Dinero que quedó.

Fórmula funcional:

```txt
Entró = ventas de contado + abonos recibidos
Salió = gastos
Quedó = Entró - Salió
```

Importante:

```txt
"Quedó" no significa ganancia neta contable.
```

La app debe evitar decir que el negocio ganó realmente esa cantidad, porque para saber ganancia real se necesitaría información adicional como costo de productos, inventario, márgenes e impuestos.

Criterios de aceptación:

- El resumen debe calcularse con los movimientos del negocio activo.
- El resumen no debe mezclar datos de otros negocios.
- El resumen debe actualizarse cuando se registra una venta o gasto.
- El resumen debe poder consultarse sin internet.

Ejemplo visual:

```txt
Hoy

Entró:  $120.000
Salió:   $45.000
Quedó:   $75.000
```

---

### RF-CD-004: Ver historial de movimientos

El usuario debe poder consultar los movimientos registrados.

Filtros iniciales:

- Hoy.
- Ayer.
- Esta semana.
- Este mes.
- Rango personalizado.

Cada movimiento debe mostrar:

- Tipo: venta o gasto.
- Monto.
- Fecha.
- Hora.
- Categoría, si aplica.
- Nota, si aplica.
- Estado, si aplica.

Ejemplo:

```txt
Hoy

Venta        $10.000   8:30 a. m.
Gasto        $5.000    9:10 a. m.   Compra de mercancía
Venta        $3.500    10:15 a. m.
```

Criterios de aceptación:

- El historial debe mostrar solo movimientos del negocio activo.
- El usuario debe poder diferenciar visualmente ventas y gastos.
- Los movimientos anulados no deben afectar los totales.
- El historial debe poder consultarse sin internet.

---

### RF-CD-005: Corregir un movimiento

El usuario debe poder corregir un movimiento registrado por error.

Campos corregibles:

- Monto.
- Nota.
- Categoría, si es gasto.
- Fecha del movimiento.

Restricciones:

- No se puede cambiar el negocio al que pertenece el movimiento.
- No se puede convertir una venta en gasto o un gasto en venta en la primera versión.
- Un movimiento anulado no se puede corregir.

Criterios de aceptación:

- Después de corregir, el resumen debe recalcularse.
- La fecha de actualización debe cambiar.
- Si el movimiento está pendiente de sincronizar, debe mantenerse como pendiente.
- Si el movimiento ya estaba sincronizado, debe marcarse como modificado pendiente de sincronización.

---

### RF-CD-006: Anular un movimiento

El usuario debe poder anular una venta o gasto registrado por error.

Anular no significa borrar físicamente el dato. Significa que el movimiento queda marcado como anulado y deja de afectar los totales.

Flujo esperado:

```txt
Usuario abre historial
↓
Selecciona movimiento
↓
Toca "Anular"
↓
Confirma la acción
↓
El movimiento queda anulado
↓
El resumen se recalcula
```

Criterios de aceptación:

- El movimiento anulado no debe sumar en entradas ni salidas.
- El historial puede seguir mostrando el movimiento con estado "Anulado".
- La app debe pedir confirmación antes de anular.
- La anulación debe funcionar sin internet.

Mensaje sugerido:

```txt
Movimiento anulado
```

---

## 7. Requisitos no funcionales

### RNF-CD-001: Rapidez

Registrar una venta debe requerir la menor cantidad de pasos posible.

Objetivo de uso:

```txt
Abrir pantalla → tocar Venta → ingresar monto → guardar
```

---

### RNF-CD-002: Simplicidad visual

La pantalla principal de caja debe tener botones grandes y textos claros.

Botones sugeridos:

- Venta.
- Gasto.
- Ver historial.

---

### RNF-CD-003: Funcionamiento offline

El usuario debe poder registrar ventas y gastos sin conexión a internet.

Si no hay internet, la app no debe bloquear las acciones principales.

---

### RNF-CD-004: Separación de datos por negocio

Los movimientos de un negocio no deben mezclarse con los movimientos de otro.

---

### RNF-CD-005: Claridad del dinero

La app debe diferenciar claramente:

- Dinero que entró.
- Dinero que salió.
- Dinero que quedó.
- Dinero que le deben al negocio.

---

## 8. Casos de uso

### CU-CD-001: Registrar venta rápida

**Actor:** Usuario autenticado  
**Precondición:** El usuario seleccionó un negocio activo.  
**Resultado esperado:** La venta queda registrada y aumenta el total de entradas del día.

Flujo principal:

1. El usuario entra al negocio.
2. La app muestra la pantalla de caja.
3. El usuario toca "Venta".
4. El usuario ingresa el monto.
5. El usuario guarda.
6. La app registra la venta.
7. La app actualiza el resumen del día.

Flujos alternos:

- Si el monto está vacío, la app muestra error.
- Si el monto es cero o negativo, la app muestra error.
- Si no hay internet, la app guarda localmente.

---

### CU-CD-002: Registrar gasto

**Actor:** Usuario autenticado  
**Precondición:** El usuario seleccionó un negocio activo.  
**Resultado esperado:** El gasto queda registrado y aumenta el total de salidas del día.

Flujo principal:

1. El usuario entra al negocio.
2. Toca "Gasto".
3. Ingresa el monto.
4. Selecciona categoría.
5. Guarda.
6. La app registra el gasto.
7. La app actualiza el resumen.

Flujos alternos:

- Si no selecciona categoría, puede usarse "Otro" por defecto.
- Si no hay internet, la app guarda localmente.

---

### CU-CD-003: Consultar resumen del día

**Actor:** Usuario autenticado  
**Precondición:** Existe un negocio activo.  
**Resultado esperado:** El usuario ve cuánto entró, salió y quedó en el día.

Flujo principal:

1. El usuario entra al negocio.
2. La app muestra el resumen del día.
3. El usuario puede identificar entradas, salidas y diferencia.

---

### CU-CD-004: Consultar historial

**Actor:** Usuario autenticado  
**Precondición:** Existe un negocio activo.  
**Resultado esperado:** El usuario ve los movimientos del negocio.

Flujo principal:

1. El usuario entra al negocio.
2. Toca "Historial".
3. La app muestra los movimientos recientes.
4. El usuario puede filtrar por fecha.

---

## 9. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| El usuario intenta registrar monto vacío | Mostrar mensaje de error |
| El usuario intenta registrar monto 0 | No permitir guardar |
| El usuario intenta registrar monto negativo | No permitir guardar |
| No hay negocio activo | Redirigir a selección de negocio |
| No hay internet | Guardar localmente |
| El usuario anula una venta | La venta deja de sumar en entradas |
| El usuario anula un gasto | El gasto deja de sumar en salidas |
| El usuario cambia de negocio | La caja debe mostrar solo datos del nuevo negocio |
| El usuario consulta un día sin movimientos | Mostrar estado vacío amigable |

---

## 10. Mensajes sugeridos

| Situación | Mensaje |
|---|---|
| Venta guardada | Venta guardada |
| Gasto guardado | Gasto guardado |
| Error por monto vacío | Ingresa un monto |
| Error por monto inválido | El monto debe ser mayor que cero |
| Movimiento anulado | Movimiento anulado |
| Día sin movimientos | Hoy todavía no hay movimientos |
| Sin internet | Sin conexión. Tus datos se guardarán en este dispositivo |

---

## 11. Decisiones funcionales tomadas

- La caja diaria representa dinero real que entró o salió.
- Una venta de contado aumenta las entradas del día.
- Un gasto aumenta las salidas del día.
- Un fiado nuevo no aumenta las entradas del día.
- Un abono de fiado sí aumenta las entradas del día.
- El resumen diario muestra "Entró", "Salió" y "Quedó".
- El sistema no hablará de ganancia neta en el MVP.
- Los movimientos pertenecen siempre a un negocio específico.
- Los movimientos podrán corregirse o anularse.
- Los movimientos anulados no se eliminan físicamente.

---

## 12. Decisiones pendientes

- Definir si existirá un cierre de caja manual.
- Definir si un movimiento sincronizado podrá editarse libremente o solo anularse.
- Definir si las categorías de gasto serán fijas, personalizables o mixtas.
- Definir si las ventas tendrán categorías.
- Definir si el usuario podrá adjuntar foto de recibo en una fase futura.
- Definir si el resumen semanal se calcula en este módulo o en el módulo de reportes.

---

# Parte 2: Enfoque técnico

## 13. Stack técnico relacionado

Este módulo se construirá con las decisiones técnicas base del proyecto:

| Componente | Tecnología |
|---|---|
| Aplicación móvil | React Native + Expo |
| Base de datos local | SQLite |
| Backend API | Hono |
| Base de datos remota | PostgreSQL |
| ORM / Query Builder | Drizzle |
| Autenticación | Better Auth |

---

## 14. Modelo técnico inicial

Entidad principal:

```ts
CashMovement {
  id: string
  businessId: string
  type: "SALE" | "EXPENSE" | "CREDIT_PAYMENT"
  amount: number
  category?: string
  note?: string
  movementDate: string
  status: "ACTIVE" | "CANCELLED"
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  syncStatus: "PENDING" | "SYNCED" | "FAILED"
  lastSyncedAt?: string
}
```

Notas:

- `id` debe ser UUID generado desde el cliente.
- `businessId` es obligatorio.
- `amount` debe almacenarse como entero en pesos colombianos.
- `type` define si el movimiento suma como entrada o salida.
- `status` permite anular sin borrar.
- `syncStatus` prepara el módulo para sincronización offline.

---

## 15. Reglas de cálculo

### Entradas del día

```ts
entradas = sum(
  movements where
    businessId = activeBusinessId
    and movementDate is today
    and status = "ACTIVE"
    and type in ["SALE", "CREDIT_PAYMENT"]
)
```

### Salidas del día

```ts
salidas = sum(
  movements where
    businessId = activeBusinessId
    and movementDate is today
    and status = "ACTIVE"
    and type = "EXPENSE"
)
```

### Dinero que quedó

```ts
quedo = entradas - salidas
```

---

## 16. Ejemplo de tabla en Drizzle

> Este ejemplo es orientativo. El esquema final puede ajustarse en el documento de modelo de datos.

```ts
import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const cashMovements = pgTable("cash_movements", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  type: text("type", {
    enum: ["SALE", "EXPENSE", "CREDIT_PAYMENT"],
  }).notNull(),
  amount: integer("amount").notNull(),
  category: text("category"),
  note: text("note"),
  movementDate: timestamp("movement_date").notNull(),
  status: text("status", {
    enum: ["ACTIVE", "CANCELLED"],
  }).notNull().default("ACTIVE"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  syncStatus: text("sync_status", {
    enum: ["PENDING", "SYNCED", "FAILED"],
  }).notNull().default("PENDING"),
  lastSyncedAt: timestamp("last_synced_at"),
});
```

---

## 17. Endpoints iniciales en Hono

Los endpoints deben estar protegidos por autenticación y autorización por negocio.

### Crear movimiento

```http
POST /businesses/:businessId/cash-movements
```

Body:

```json
{
  "id": "uuid-generado-en-cliente",
  "type": "SALE",
  "amount": 10000,
  "note": "Venta rápida",
  "movementDate": "2026-07-09T10:30:00-05:00"
}
```

Respuesta:

```json
{
  "id": "uuid-generado-en-cliente",
  "businessId": "uuid-negocio",
  "type": "SALE",
  "amount": 10000,
  "status": "ACTIVE"
}
```

---

### Listar movimientos

```http
GET /businesses/:businessId/cash-movements?from=2026-07-01&to=2026-07-09
```

---

### Obtener resumen diario

```http
GET /businesses/:businessId/cash-summary?date=2026-07-09
```

Respuesta:

```json
{
  "date": "2026-07-09",
  "in": 120000,
  "out": 45000,
  "remaining": 75000
}
```

---

### Actualizar movimiento

```http
PATCH /businesses/:businessId/cash-movements/:movementId
```

---

### Anular movimiento

```http
POST /businesses/:businessId/cash-movements/:movementId/cancel
```

Body:

```json
{
  "reason": "Monto registrado por error"
}
```

---

## 18. Autorización de endpoints

Todo endpoint debe validar:

1. El usuario está autenticado.
2. El negocio existe.
3. El negocio pertenece al usuario o el usuario tiene acceso al negocio.
4. El movimiento pertenece al negocio indicado.

Regla:

```txt
Un usuario no puede consultar, crear, corregir ni anular movimientos de un negocio al que no pertenece.
```

---

## 19. Consideraciones offline

En la app móvil, las ventas y gastos deben guardarse primero en SQLite.

Flujo local:

```txt
Usuario registra venta o gasto
↓
Se guarda en SQLite
↓
Se marca con syncStatus = PENDING
↓
La app actualiza el resumen local
↓
Cuando haya internet, podrá intentar sincronizar
```

Para el MVP, la sincronización completa se definirá en el documento específico de modo offline y sincronización.

Campos mínimos para soportar sincronización futura:

- `id`
- `businessId`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `syncStatus`
- `lastSyncedAt`

---

## 20. Validaciones técnicas

| Campo | Validación |
|---|---|
| id | UUID obligatorio |
| businessId | UUID obligatorio |
| type | SALE, EXPENSE o CREDIT_PAYMENT |
| amount | Entero mayor que 0 |
| category | Obligatoria para gastos, opcional para ventas |
| note | Opcional, longitud máxima sugerida: 200 caracteres |
| movementDate | Fecha válida, no futura para MVP |
| status | ACTIVE o CANCELLED |

---

## 21. Estados de un movimiento

| Estado | Descripción | Afecta totales |
|---|---|---|
| ACTIVE | Movimiento válido | Sí |
| CANCELLED | Movimiento anulado | No |

---

## 22. Definición de terminado

Este módulo estará terminado cuando:

- El usuario pueda registrar ventas desde un negocio activo.
- El usuario pueda registrar gastos desde un negocio activo.
- El resumen del día se actualice correctamente.
- El historial muestre los movimientos del negocio activo.
- Los movimientos puedan corregirse o anularse según las reglas definidas.
- Los datos se guarden localmente en SQLite.
- Las operaciones funcionen sin internet.
- Los endpoints del backend estén protegidos por autenticación y autorización por negocio.
- Los movimientos no se mezclen entre negocios.

---

## 23. Relación con otros documentos

Este documento se relaciona con:

- `01-autenticacion-y-gestion-de-negocios.md`
- `03-clientes-fiados-y-abonos.md`
- `04-reportes-resumenes-e-historial.md`
- `05-modo-offline-y-sincronizacion.md`
- `06-modelo-de-datos.md`
- `07-arquitectura-y-stack-tecnico.md`

---

## 24. Resumen corto del módulo

El módulo de caja diaria permite registrar ventas y gastos de forma rápida, calcular cuánto dinero entró, cuánto salió y cuánto quedó, manteniendo los datos separados por negocio y funcionando sin conexión a internet.