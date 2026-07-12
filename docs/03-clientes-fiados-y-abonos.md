# 03 - Clientes, Fiados y Abonos

## Estado del documento

**Proyecto:** Aplicación móvil de gestión básica para pequeños negocios  
**Módulo:** Clientes, fiados y abonos  
**Versión:** 1.0  
**Estado:** Borrador funcional y técnico inicial  
**Metodología:** Spec Driven Development (SDD)

---

# Parte 1 - Enfoque funcional / no técnico

## 1. Propósito del módulo

Este módulo permite que el usuario lleve el control de las personas que le deben dinero al negocio.

En muchos pequeños negocios, especialmente tiendas de barrio, es común vender productos o servicios “fiados”. El problema es que normalmente estas deudas se registran en cuadernos, notas sueltas o de memoria, lo que puede generar olvidos, errores, discusiones con clientes y pérdida de dinero.

La funcionalidad de fiados busca reemplazar ese control manual con una herramienta simple, rápida y fácil de entender.

El usuario podrá:

- Registrar clientes.
- Registrar nuevos fiados.
- Registrar abonos parciales o pagos completos.
- Ver cuánto debe cada cliente.
- Ver cuánto dinero le deben en total.
- Identificar deudas antiguas.
- Consultar el historial de fiados y abonos.

---

## 2. Alcance del módulo

Este módulo cubre tres conceptos principales:

1. **Clientes**  
   Personas que compran fiado o que pueden tener deudas con el negocio.

2. **Fiados**  
   Deudas generadas cuando un cliente recibe productos o servicios y no paga en ese momento.

3. **Abonos**  
   Pagos parciales o totales que realiza un cliente para reducir una deuda.

---

## 3. Flujo general del usuario

```txt
Usuario entra a un negocio
  ↓
Abre el módulo de fiados
  ↓
Puede crear o seleccionar un cliente
  ↓
Puede registrar un nuevo fiado
  ↓
Puede registrar abonos
  ↓
Puede consultar deuda pendiente por cliente
  ↓
Puede consultar total por cobrar del negocio
```

---

## 4. Conceptos funcionales

### 4.1 Cliente

Un cliente es una persona asociada a un negocio que puede tener uno o varios fiados.

Ejemplos:

- Pedro Pérez.
- Doña Marta.
- Carlos vecino.
- Cliente sin teléfono.

El sistema no debe exigir demasiada información para crear un cliente. En el MVP, el único dato obligatorio debe ser el nombre.

---

### 4.2 Fiado

Un fiado representa una deuda.

Ejemplo:

```txt
Pedro llevó productos por $12.000 y no pagó en el momento.
Se registra un fiado por $12.000.
```

El fiado aumenta el dinero pendiente por cobrar, pero no aumenta el dinero que entró a caja, porque todavía no se recibió pago.

---

### 4.3 Abono

Un abono es un pago que realiza el cliente para reducir una deuda.

Ejemplo:

```txt
Pedro debía $12.000.
Pedro abona $5.000.
Pedro queda debiendo $7.000.
```

El abono sí representa dinero real recibido, por lo tanto debe reflejarse como entrada en la caja diaria.

---

## 5. Reglas funcionales principales

### RFN-001 - Todo cliente pertenece a un negocio

Un cliente debe estar asociado a un negocio específico.

Esto evita mezclar clientes entre diferentes negocios del mismo usuario.

Ejemplo:

```txt
Usuario tiene dos negocios:
- Tienda La 20
- Puesto de comidas

El cliente Pedro puede existir en ambos negocios, pero cada registro es independiente.
```

---

### RFN-002 - Todo fiado pertenece a un cliente y a un negocio

No puede existir un fiado sin cliente.

Todo fiado debe indicar:

- Cliente.
- Negocio.
- Monto.
- Fecha.
- Estado.

---

### RFN-003 - Un cliente puede tener varios fiados activos

El sistema debe permitir que un cliente tenga más de una deuda pendiente.

Ejemplo:

```txt
Pedro:
- Fiado 1: $10.000
- Fiado 2: $6.000
- Fiado 3: $3.500

Total pendiente de Pedro: $19.500
```

---

### RFN-004 - Un fiado nuevo no entra como dinero recibido

Cuando se registra un fiado, el sistema debe aumentar el total por cobrar, pero no debe aumentar las entradas de caja del día.

Ejemplo:

```txt
Venta fiada: $10.000
Dinero que entró hoy: $0
Dinero por cobrar: $10.000
```

---

### RFN-005 - Un abono reduce la deuda pendiente

Cuando el cliente realiza un abono, el sistema debe descontar ese valor del saldo pendiente.

Ejemplo:

```txt
Deuda inicial: $10.000
Abono: $4.000
Saldo pendiente: $6.000
```

---

### RFN-006 - Un abono entra a caja

Todo abono recibido debe contar como dinero que entró al negocio en la fecha del pago.

Ejemplo:

```txt
Pedro abona $4.000 hoy.
Entradas de caja de hoy aumentan en $4.000.
```

---

### RFN-007 - Una deuda queda pagada cuando el saldo llega a cero

Si los abonos cubren la totalidad de la deuda, el fiado debe marcarse como pagado.

Ejemplo:

```txt
Fiado: $10.000
Abonos acumulados: $10.000
Estado: Pagado
```

---

### RFN-008 - No se permiten abonos mayores al saldo pendiente en el MVP

Para evitar confusión, el sistema no debe permitir registrar un abono mayor al valor pendiente de la deuda.

Ejemplo:

```txt
Saldo pendiente: $6.000
Usuario intenta registrar abono: $10.000
Sistema muestra: “El abono no puede ser mayor a lo que debe el cliente.”
```

---

### RFN-009 - Una deuda puede ser cancelada por error

Si el usuario registró un fiado por equivocación, debe poder cancelarlo.

Una deuda cancelada no debe afectar el total por cobrar.

No se recomienda eliminar físicamente la deuda, porque es mejor conservar trazabilidad.

---

### RFN-010 - Un abono puede ser cancelado por error

Si el usuario registró un abono incorrecto, debe poder cancelarlo.

Cuando se cancela un abono:

- El saldo pendiente de la deuda vuelve a aumentar.
- El movimiento de caja asociado al abono también debe quedar anulado.

---

## 6. Requisitos funcionales

### RF-001 - Crear cliente

El usuario debe poder crear un cliente dentro de un negocio.

Campos mínimos:

- Nombre del cliente.

Campos opcionales:

- Teléfono.
- Nota.

Criterios de aceptación:

- El sistema permite crear un cliente solo con nombre.
- El cliente queda asociado al negocio activo.
- El cliente aparece en la lista de clientes del negocio.

---

### RF-002 - Consultar lista de clientes

El usuario debe poder ver los clientes registrados en el negocio.

La lista debe mostrar:

- Nombre.
- Total pendiente.
- Cantidad de fiados activos.
- Indicador visual si tiene deudas antiguas.

Criterios de aceptación:

- Se muestran solo clientes del negocio activo.
- Se puede buscar cliente por nombre.
- Los clientes sin deuda pueden mostrarse separados o con total pendiente en cero.

---

### RF-003 - Registrar fiado

El usuario debe poder registrar un nuevo fiado a un cliente.

Campos obligatorios:

- Cliente.
- Monto.
- Fecha.

Campos opcionales:

- Descripción o nota.

Criterios de aceptación:

- El monto debe ser mayor a cero.
- El fiado queda asociado al cliente y al negocio activo.
- El fiado inicia con estado pendiente.
- El total por cobrar del negocio aumenta.
- La caja diaria no aumenta, porque no se recibió dinero.

---

### RF-004 - Registrar abono

El usuario debe poder registrar un abono sobre un fiado pendiente.

Campos obligatorios:

- Fiado.
- Monto.
- Fecha.

Campos opcionales:

- Nota.

Criterios de aceptación:

- El monto debe ser mayor a cero.
- El monto no puede superar el saldo pendiente.
- El saldo pendiente disminuye.
- Si el saldo llega a cero, el fiado queda pagado.
- El abono genera una entrada en caja.

---

### RF-005 - Ver detalle de cliente

El usuario debe poder entrar al detalle de un cliente.

Debe ver:

- Información básica del cliente.
- Total pendiente.
- Fiados activos.
- Fiados pagados.
- Abonos realizados.
- Historial general.

---

### RF-006 - Ver detalle de fiado

El usuario debe poder ver el detalle de una deuda.

Debe mostrar:

- Cliente.
- Monto original.
- Total abonado.
- Saldo pendiente.
- Fecha del fiado.
- Días transcurridos.
- Estado.
- Lista de abonos.

---

### RF-007 - Cancelar fiado

El usuario debe poder cancelar un fiado registrado por error.

Criterios de aceptación:

- El fiado pasa a estado cancelado.
- No se elimina físicamente.
- No suma al total por cobrar.
- No permite nuevos abonos.

---

### RF-008 - Cancelar abono

El usuario debe poder cancelar un abono registrado por error.

Criterios de aceptación:

- El abono queda anulado.
- El saldo pendiente se recalcula.
- La entrada de caja asociada también queda anulada.

---

### RF-009 - Ver total por cobrar

El usuario debe poder ver cuánto dinero le deben en total dentro del negocio activo.

Criterios de aceptación:

- Solo se suman fiados pendientes.
- No se suman fiados pagados.
- No se suman fiados cancelados.
- El total se calcula con los saldos pendientes, no con los montos originales.

---

### RF-010 - Ver deudas antiguas

El usuario debe poder identificar deudas antiguas.

Criterios de aceptación:

- El sistema debe calcular los días desde la fecha del fiado.
- Debe existir un indicador visual según antigüedad.
- El usuario debe poder filtrar o ver fácilmente las deudas más antiguas.

---

## 7. Requisitos no funcionales

### RNF-001 - Simplicidad

Registrar un fiado o un abono debe requerir pocos pasos.

Ejemplo ideal para registrar fiado:

```txt
Seleccionar cliente → ingresar monto → guardar
```

---

### RNF-002 - Lenguaje cotidiano

La interfaz debe usar palabras simples.

Usar:

- Fiado.
- Abono.
- Debe.
- Pagó.
- Pendiente.
- Pagado.
- Me deben.

Evitar:

- Cuenta por cobrar.
- Crédito comercial.
- Cartera.
- Amortización.
- Obligación.

---

### RNF-003 - Funcionamiento offline

El usuario debe poder crear clientes, registrar fiados y registrar abonos sin conexión a internet.

Los datos deben guardarse primero en SQLite.

---

### RNF-004 - Separación por negocio

Los clientes y fiados de un negocio no deben aparecer en otro negocio.

---

### RNF-005 - Rapidez

La consulta de clientes y deudas debe ser rápida, incluso con muchos registros.

---

### RNF-006 - Trazabilidad

Las operaciones financieras importantes no deben eliminarse físicamente.

Se recomienda usar estados como:

- Pendiente.
- Pagado.
- Cancelado.

---

## 8. Casos de uso funcionales

### CU-001 - Crear cliente rápido

**Actor:** Usuario autenticado.  
**Contexto:** El usuario está dentro de un negocio.  
**Flujo:**

1. El usuario abre la sección de clientes o fiados.
2. Presiona “Nuevo cliente”.
3. Escribe el nombre.
4. Guarda.
5. El sistema crea el cliente dentro del negocio activo.

**Resultado:** Cliente creado correctamente.

---

### CU-002 - Registrar fiado a cliente existente

**Actor:** Usuario autenticado.  
**Contexto:** El cliente ya existe.  
**Flujo:**

1. El usuario busca o selecciona un cliente.
2. Presiona “Nuevo fiado”.
3. Ingresa el monto.
4. Opcionalmente escribe una nota.
5. Guarda.
6. El sistema registra el fiado.

**Resultado:** El cliente queda con una nueva deuda pendiente.

---

### CU-003 - Registrar fiado creando cliente en el momento

**Actor:** Usuario autenticado.  
**Contexto:** El cliente no existe todavía.  
**Flujo:**

1. El usuario presiona “Nuevo fiado”.
2. El sistema permite crear o escribir el cliente.
3. El usuario ingresa nombre del cliente.
4. Ingresa monto.
5. Guarda.
6. El sistema crea el cliente y registra el fiado.

**Resultado:** Cliente y fiado creados correctamente.

---

### CU-004 - Registrar abono parcial

**Actor:** Usuario autenticado.  
**Contexto:** Existe una deuda pendiente.  
**Flujo:**

1. El usuario abre el detalle del cliente.
2. Selecciona una deuda pendiente.
3. Presiona “Registrar abono”.
4. Ingresa el monto.
5. Guarda.
6. El sistema reduce el saldo pendiente.
7. El sistema registra una entrada en caja.

**Resultado:** El saldo pendiente disminuye.

---

### CU-005 - Registrar pago total

**Actor:** Usuario autenticado.  
**Contexto:** Existe una deuda pendiente.  
**Flujo:**

1. El usuario abre una deuda.
2. Presiona “Pagar todo”.
3. Confirma.
4. El sistema registra un abono por el saldo pendiente.
5. El sistema marca la deuda como pagada.

**Resultado:** La deuda queda en cero y cambia a pagada.

---

### CU-006 - Cancelar fiado por error

**Actor:** Usuario autenticado.  
**Contexto:** Se registró un fiado incorrectamente.  
**Flujo:**

1. El usuario abre el detalle del fiado.
2. Presiona “Cancelar fiado”.
3. El sistema solicita confirmación.
4. El usuario confirma.
5. El sistema marca la deuda como cancelada.

**Resultado:** El fiado deja de afectar el total por cobrar.

---

### CU-007 - Consultar quién debe más

**Actor:** Usuario autenticado.  
**Contexto:** Hay clientes con deudas pendientes.  
**Flujo:**

1. El usuario abre la sección de fiados.
2. El sistema muestra la lista de clientes con saldo pendiente.
3. El usuario ordena por mayor deuda.

**Resultado:** El usuario identifica rápidamente los clientes que más deben.

---

## 9. Casos límite

### CL-001 - Cliente duplicado

El sistema puede permitir nombres repetidos, pero debe ayudar a evitar duplicados mostrando coincidencias.

Ejemplo:

```txt
El usuario escribe “Pedro”.
El sistema muestra:
“Ya tienes clientes parecidos: Pedro Pérez, Pedro vecino.”
```

---

### CL-002 - Fiado con monto cero

No se debe permitir crear fiados con monto cero o negativo.

---

### CL-003 - Abono con monto cero

No se debe permitir crear abonos con monto cero o negativo.

---

### CL-004 - Abono mayor al saldo

En el MVP no se debe permitir.

---

### CL-005 - Cliente con fiados activos eliminado

No se debe eliminar físicamente un cliente con fiados activos.

Opciones:

- Impedir eliminación.
- Permitir archivarlo solo si no tiene deuda pendiente.

Para MVP se recomienda:

```txt
No permitir eliminar cliente con deuda pendiente.
```

---

### CL-006 - Fiado pagado recibe nuevo abono

No se debe permitir registrar abonos sobre fiados pagados.

---

### CL-007 - Fiado cancelado recibe nuevo abono

No se debe permitir registrar abonos sobre fiados cancelados.

---

# Parte 2 - Enfoque técnico

## 10. Decisiones técnicas del módulo

Este módulo debe seguir las decisiones base del proyecto:

| Componente | Tecnología |
|---|---|
| Aplicación móvil | React Native + Expo |
| Base local | SQLite |
| Backend API | Hono |
| Base remota | PostgreSQL |
| ORM / Query Builder | Drizzle |
| Autenticación | Better Auth |

---

## 11. Modelo conceptual

```txt
User
  └── Business
        ├── Customer
        │     └── Credit
        │           └── CreditPayment
        └── CashMovement
```

Relaciones:

- Un usuario tiene negocios.
- Un negocio tiene clientes.
- Un cliente tiene fiados.
- Un fiado tiene abonos.
- Un abono genera un movimiento de caja.

---

## 12. Entidades técnicas iniciales

### 12.1 Customer

```ts
Customer {
  id: string
  businessId: string
  name: string
  phone?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  syncStatus: "PENDING" | "SYNCED" | "FAILED"
  lastSyncedAt?: Date
}
```

---

### 12.2 Credit

```ts
Credit {
  id: string
  businessId: string
  customerId: string
  amount: number
  description?: string
  creditDate: Date
  status: "PENDING" | "PAID" | "CANCELLED"
  cancelledReason?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  syncStatus: "PENDING" | "SYNCED" | "FAILED"
  lastSyncedAt?: Date
}
```

---

### 12.3 CreditPayment

```ts
CreditPayment {
  id: string
  businessId: string
  customerId: string
  creditId: string
  amount: number
  paymentDate: Date
  note?: string
  status: "ACTIVE" | "CANCELLED"
  cashMovementId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  syncStatus: "PENDING" | "SYNCED" | "FAILED"
  lastSyncedAt?: Date
}
```

---

### 12.4 CashMovement relacionado

Cuando se registra un abono, se debe crear un movimiento de caja.

```ts
CashMovement {
  id: string
  businessId: string
  type: "CREDIT_PAYMENT"
  amount: number
  note?: string
  movementDate: Date
  relatedCreditPaymentId: string
  status: "ACTIVE" | "CANCELLED"
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  syncStatus: "PENDING" | "SYNCED" | "FAILED"
  lastSyncedAt?: Date
}
```

---

## 13. Reglas técnicas de cálculo

### 13.1 Saldo pendiente de un fiado

```txt
saldoPendiente = credit.amount - suma(abonos activos del credit)
```

Solo se deben sumar abonos con estado activo.

---

### 13.2 Estado pagado

```txt
Si saldoPendiente = 0 → credit.status = PAID
```

---

### 13.3 Total por cobrar de un cliente

```txt
totalCliente = suma(saldos pendientes de créditos PENDING del cliente)
```

---

### 13.4 Total por cobrar del negocio

```txt
totalNegocio = suma(saldos pendientes de créditos PENDING del negocio)
```

---

### 13.5 Deuda antigua

```txt
diasPendiente = fechaActual - credit.creditDate
```

Clasificación sugerida:

```txt
0 a 7 días: reciente
8 a 15 días: atención
Más de 15 días: antigua
```

Esta configuración puede cambiar después.

---

## 14. Endpoints sugeridos

Los endpoints exactos se detallarán en el documento de contratos API, pero se propone esta estructura inicial.

### Clientes

```http
GET    /businesses/:businessId/customers
POST   /businesses/:businessId/customers
GET    /businesses/:businessId/customers/:customerId
PATCH  /businesses/:businessId/customers/:customerId
DELETE /businesses/:businessId/customers/:customerId
```

---

### Fiados

```http
GET    /businesses/:businessId/credits
POST   /businesses/:businessId/credits
GET    /businesses/:businessId/credits/:creditId
POST   /businesses/:businessId/credits/:creditId/cancel
```

---

### Abonos

```http
POST   /businesses/:businessId/credits/:creditId/payments
POST   /businesses/:businessId/credits/:creditId/payments/:paymentId/cancel
```

---

### Consultas rápidas

```http
GET /businesses/:businessId/credits/summary
GET /businesses/:businessId/customers/:customerId/summary
```

---

## 15. Autorización de endpoints

Todos los endpoints del módulo deben estar protegidos.

Reglas:

1. El usuario debe estar autenticado.
2. El usuario debe tener acceso al negocio indicado por `businessId`.
3. El usuario no puede consultar ni modificar clientes, fiados o abonos de otro negocio.

Middleware sugerido:

```txt
requireAuth
requireBusinessAccess
```

---

## 16. SQLite y modo offline

La app móvil debe guardar primero los datos localmente en SQLite.

Cuando el usuario crea un cliente, fiado o abono:

```txt
1. Se genera un UUID en el dispositivo.
2. Se guarda en SQLite.
3. Se marca con syncStatus = PENDING.
4. La interfaz se actualiza inmediatamente.
5. Si hay conexión, se intenta sincronizar después.
```

---

## 17. IDs

Todas las entidades deben usar UUID generados desde el cliente.

Esto permite crear registros offline sin depender del backend.

Ejemplo:

```txt
id = "6f9b2f33-1e2a-4e21-9e4d-9a7b9b8f4a11"
```

---

## 18. Sincronización futura

Aunque la estrategia completa de sincronización se definirá en otro documento, este módulo debe quedar preparado para sincronizarse.

Campos necesarios:

- `syncStatus`.
- `lastSyncedAt`.
- `createdAt`.
- `updatedAt`.
- `deletedAt`.

Operaciones que deben sincronizarse:

- Crear cliente.
- Actualizar cliente.
- Crear fiado.
- Cancelar fiado.
- Crear abono.
- Cancelar abono.

---

## 19. Consistencia entre abonos y caja

Cuando se crea un abono, también se debe crear un movimiento de caja tipo `CREDIT_PAYMENT`.

Estas dos operaciones deben tratarse como una sola acción lógica.

En SQLite:

```txt
crear CreditPayment
crear CashMovement relacionado
```

Si una falla, no debería quedar la otra incompleta.

En backend:

```txt
usar transacción de base de datos
```

---

## 20. Ejemplo técnico de registro de abono

Entrada del usuario:

```json
{
  "creditId": "credit-uuid",
  "amount": 5000,
  "paymentDate": "2025-08-15",
  "note": "Abono en efectivo"
}
```

Resultado esperado:

```txt
1. Se valida que el fiado exista.
2. Se valida que pertenezca al negocio activo.
3. Se valida que esté pendiente.
4. Se calcula saldo pendiente.
5. Se valida que el abono no supere el saldo.
6. Se crea CreditPayment.
7. Se crea CashMovement tipo CREDIT_PAYMENT.
8. Se recalcula el estado del fiado.
9. Si saldo queda en cero, se marca como PAID.
```

---

## 21. Validaciones técnicas

### Cliente

- `name` es obligatorio.
- `name` no debe estar vacío.
- `phone` es opcional.

### Fiado

- `amount` es obligatorio.
- `amount` debe ser mayor a cero.
- `customerId` debe existir.
- `businessId` debe coincidir con el negocio activo.

### Abono

- `amount` es obligatorio.
- `amount` debe ser mayor a cero.
- `amount` no debe superar el saldo pendiente.
- `creditId` debe existir.
- El fiado debe estar pendiente.

---

## 22. Mensajes sugeridos para la interfaz

### Éxito

```txt
Cliente guardado.
Fiado registrado.
Abono registrado.
Deuda pagada.
```

### Error

```txt
Escribe el nombre del cliente.
El monto debe ser mayor a cero.
El abono no puede ser mayor a lo que debe el cliente.
No puedes abonar a una deuda pagada.
No puedes modificar datos de otro negocio.
```

### Confirmación

```txt
¿Seguro que quieres cancelar este fiado?
¿Seguro que quieres cancelar este abono?
```

---

## 23. Decisiones pendientes

1. ¿Se permitirá un cliente genérico tipo “Cliente varios”?
2. ¿Se permitirá registrar un fiado sin nombre de cliente?
3. ¿Se permitirá dividir un abono entre varias deudas del mismo cliente?
4. ¿Se permitirá abonar al total del cliente sin escoger deuda específica?
5. ¿Se permitirá editar el monto de un fiado antes de sincronizar?
6. ¿Se permitirá editar datos de cliente después de crearlo?
7. ¿Se permitirá configurar los días para considerar una deuda antigua?
8. ¿Se permitirá enviar recordatorios por WhatsApp en una fase futura?

---

## 24. Decisiones recomendadas para el MVP

Para mantener el producto simple, se recomienda:

- Permitir crear cliente solo con nombre.
- No permitir fiados sin cliente.
- Permitir varios fiados por cliente.
- Registrar abonos sobre una deuda específica.
- No permitir abonos mayores al saldo pendiente.
- Cancelar en lugar de eliminar fiados y abonos.
- Hacer que todo abono cree una entrada de caja.
- No implementar recordatorios automáticos en el MVP.

---

## 25. Definición de terminado

Este módulo estará terminado cuando:

- El usuario pueda crear clientes dentro de un negocio.
- El usuario pueda ver clientes del negocio activo.
- El usuario pueda registrar fiados.
- El usuario pueda registrar abonos.
- El sistema calcule saldo pendiente por fiado.
- El sistema calcule total por cobrar por cliente.
- El sistema calcule total por cobrar del negocio.
- El sistema marque deudas como pagadas cuando corresponda.
- El sistema permita cancelar fiados y abonos.
- Los abonos se reflejen en caja como entrada de dinero.
- El módulo funcione guardando primero en SQLite.
- Los datos estén preparados para sincronización futura.
