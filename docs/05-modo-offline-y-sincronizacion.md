# 05 - Modo Offline y Sincronización

## Estado del documento

**Módulo:** Modo offline y sincronización  
**Estado:** Propuesta inicial para validación  
**Proyecto:** Aplicación móvil para gestión básica de pequeños negocios  
**Metodología:** Spec Driven Development (SDD)  
**Documento anterior:** `04-reportes-resumenes-e-historial.md`  
**Documento siguiente sugerido:** `06-modelo-de-datos.md`

---

# Parte 1: Enfoque funcional / no técnico

## 1. Propósito

La aplicación debe poder usarse aunque el dispositivo no tenga conexión a internet.

El usuario debe poder seguir trabajando normalmente para:

- Consultar sus negocios ya cargados.
- Entrar a un negocio.
- Registrar ventas.
- Registrar gastos.
- Crear clientes.
- Registrar fiados.
- Registrar abonos.
- Consultar resúmenes e historiales disponibles en el dispositivo.

Cuando vuelva la conexión, la aplicación debe intentar respaldar los cambios pendientes en el servidor.

El modo offline no debe sentirse como un módulo aparte. Debe ser el comportamiento normal de la aplicación cuando no hay internet.

---

## 2. Conceptos importantes

### 2.1 Modo offline

Significa que la aplicación puede seguir funcionando con la información guardada en el dispositivo.

### 2.2 Respaldo remoto

Significa que una copia de la información local se guarda en el servidor para evitar que los datos dependan únicamente del celular.

### 2.3 Sincronización

Significa mantener coordinada la información de SQLite y PostgreSQL.

### 2.4 Sincronización entre varios dispositivos

Significa que dos o más dispositivos pueden modificar información y luego combinar sus cambios.

Este último punto es el más complejo y no debe confundirse con simplemente tener modo offline.

---

## 3. Decisión propuesta para el MVP

Para la primera versión se propone:

> La aplicación operará primero sobre SQLite y sincronizará los cambios con PostgreSQL cuando exista conexión.

El alcance inicial será una sincronización simple, orientada principalmente a:

- No perder información.
- Respaldar datos.
- Recuperar información al reinstalar la aplicación.
- Permitir reintentos cuando falle una petición.
- Mantener la experiencia offline.

No se garantiza inicialmente una edición simultánea perfecta desde varios dispositivos.

---

## 4. Principio principal

Toda acción del usuario debe guardarse primero en el dispositivo.

Ejemplo:

```txt
El usuario registra una venta
        ↓
La venta se guarda en SQLite
        ↓
La pantalla se actualiza inmediatamente
        ↓
La venta queda pendiente de sincronización
        ↓
Cuando hay internet, se envía al servidor
```

La interfaz no debe esperar a que el servidor responda para confirmar una operación local.

---

## 5. Qué debe funcionar sin internet

Después de que el usuario haya iniciado sesión al menos una vez y tenga información cargada, podrá:

- Ver sus negocios disponibles localmente.
- Cambiar entre negocios almacenados en el dispositivo.
- Registrar ventas.
- Registrar gastos.
- Crear y editar clientes.
- Registrar fiados.
- Registrar abonos.
- Anular movimientos.
- Consultar resumen del día.
- Consultar total por cobrar.
- Consultar historial local.
- Ver qué cambios están pendientes de sincronización.

---

## 6. Qué requiere internet

Las siguientes acciones requieren conexión:

- Crear una cuenta.
- Iniciar sesión por primera vez.
- Iniciar sesión con Google.
- Validar una sesión nueva con Better Auth.
- Recuperar datos en un dispositivo nuevo.
- Sincronizar cambios con PostgreSQL.
- Descargar cambios realizados en otro dispositivo.
- Cerrar sesiones remotas.
- Recuperar una contraseña.
- Revocar una cuenta.

---

## 7. Comportamiento esperado para el usuario

### 7.1 Cuando hay internet

La aplicación debe:

- Guardar primero en SQLite.
- Intentar sincronizar en segundo plano.
- Mostrar el cambio inmediatamente.
- Informar discretamente si existen cambios pendientes.
- Reintentar automáticamente cuando sea posible.

### 7.2 Cuando no hay internet

La aplicación debe:

- Permitir continuar trabajando.
- Indicar que está sin conexión.
- Guardar los cambios localmente.
- No bloquear ventas, gastos, fiados o abonos.
- Marcar los cambios como pendientes.

### 7.3 Cuando vuelve internet

La aplicación debe:

1. Detectar la conexión.
2. Enviar los cambios pendientes.
3. Confirmar cuáles fueron aceptados.
4. Descargar cambios remotos posteriores.
5. Actualizar SQLite.
6. Mostrar el estado final de sincronización.

---

## 8. Estado visible de sincronización

La aplicación podrá mostrar un indicador simple:

```txt
Todo guardado
3 cambios pendientes
Sin conexión
Error al respaldar
Sincronizando
```

No se deben usar mensajes técnicos como:

```txt
Error de persistencia
Conflicto de versión
Fallo en endpoint
```

---

## 9. Requisitos funcionales

### RF-001: Guardar operaciones localmente

Toda venta, gasto, cliente, fiado y abono debe guardarse primero en SQLite.

---

### RF-002: Consultar datos sin conexión

El usuario debe poder consultar la información disponible localmente sin conexión.

---

### RF-003: Marcar cambios pendientes

Toda operación no confirmada por el servidor debe quedar marcada como pendiente de sincronización.

---

### RF-004: Sincronizar automáticamente

Cuando exista conexión, la aplicación debe intentar enviar los cambios pendientes.

---

### RF-005: Reintentar operaciones fallidas

Si una sincronización falla por red o indisponibilidad del servidor, la operación debe conservarse y reintentarse.

---

### RF-006: Evitar duplicados

Reintentar una operación no debe crear ventas, gastos, fiados o abonos duplicados.

---

### RF-007: Descargar información remota

La aplicación debe poder descargar cambios remotos y aplicarlos en SQLite.

---

### RF-008: Recuperar datos en otro dispositivo

Después de iniciar sesión en un dispositivo nuevo, el usuario debe poder descargar los datos respaldados en PostgreSQL.

---

### RF-009: Mostrar estado de sincronización

El usuario debe poder saber si:

- Todo está respaldado.
- Existen cambios pendientes.
- Hay un error.
- No existe conexión.

---

### RF-010: Mantener reportes locales actualizados

Los reportes locales deben incluir inmediatamente los cambios pendientes, aunque todavía no estén en PostgreSQL.

---

### RF-011: Separar información por usuario

La información local debe asociarse al usuario autenticado.

Si otro usuario inicia sesión en el mismo dispositivo, no debe ver los datos del usuario anterior.

---

### RF-012: Separar información por negocio

Cada cambio debe pertenecer a un negocio específico.

---

### RF-013: Controlar cierre de sesión con cambios pendientes

Si existen cambios pendientes, la aplicación debe advertirlo antes de cerrar sesión.

Ejemplo:

```txt
Tienes 8 cambios que aún no se han respaldado.
Puedes esperar a que se sincronicen o cerrar sesión y conservarlos en este dispositivo.
```

---

### RF-014: Sincronización manual

La aplicación debe ofrecer una opción para intentar sincronizar manualmente.

Ejemplo:

```txt
Sincronizar ahora
```

---

## 10. Requisitos no funcionales

### RNF-001: Respuesta inmediata

Guardar una operación local no debe depender de la latencia del servidor.

---

### RNF-002: Integridad

Una operación confirmada al usuario no debe desaparecer por una falla de red.

---

### RNF-003: Idempotencia

El servidor debe poder recibir la misma operación varias veces sin duplicarla.

---

### RNF-004: Tolerancia a fallos

Si la aplicación se cierra durante una sincronización, los cambios pendientes deben conservarse.

---

### RNF-005: Bajo consumo

La sincronización debe evitar consumo excesivo de batería y datos móviles.

---

### RNF-006: Compatibilidad

El modo offline debe funcionar en dispositivos Android de gama baja compatibles con la aplicación.

---

### RNF-007: Seguridad

Un usuario no debe poder sincronizar datos de negocios que no le pertenecen.

---

### RNF-008: Consistencia

SQLite y PostgreSQL deben usar las mismas reglas de negocio para calcular saldos, estados y reportes.

---

### RNF-009: Observabilidad

Los errores de sincronización deben poder registrarse para diagnóstico sin mostrar información técnica al usuario.

---

## 11. Reglas de negocio

### BR-001: SQLite es la base operativa de la app

La aplicación móvil lee y escribe principalmente en SQLite.

PostgreSQL actúa como almacenamiento remoto y fuente de recuperación.

---

### BR-002: Identificadores generados en el cliente

Toda entidad sincronizable debe recibir un UUID antes de guardarse localmente.

Ejemplo:

```txt
id = "01JH7K6W8B5E8M9X3P..."
```

No se deben depender de IDs autoincrementales generados por PostgreSQL.

---

### BR-003: Toda mutación tiene identificador único

Cada operación de sincronización debe tener un `operationId` único.

Esto permite que el servidor reconozca reintentos.

---

### BR-004: Guardado local antes que remoto

La operación se considera registrada en la app cuando SQLite confirma el guardado.

No se espera la respuesta de PostgreSQL para actualizar la interfaz.

---

### BR-005: Los cambios pendientes no se pierden

Un error de red no elimina una operación pendiente.

---

### BR-006: Los registros financieros no se eliminan físicamente

Ventas, gastos, fiados y abonos se anulan en lugar de eliminarse.

Esto reduce conflictos y mantiene trazabilidad.

---

### BR-007: Las operaciones financieras se tratan como eventos

Una venta, gasto, fiado o abono representa un hecho ocurrido.

Después de sincronizarse, no debe modificarse libremente.

Una corrección debe manejarse mediante:

- Anulación.
- Registro de una nueva operación correcta.

---

### BR-008: Los datos descriptivos sí pueden editarse

Entidades como negocio o cliente pueden cambiar nombre, teléfono o notas.

Estas modificaciones requieren control de versión.

---

### BR-009: El servidor valida permisos

Aunque una operación exista localmente, el servidor debe comprobar:

- Usuario autenticado.
- Propiedad o acceso al negocio.
- Validez de los datos.
- Reglas de negocio.

---

### BR-010: Una operación rechazada permanece identificable

Si el servidor rechaza una operación, esta debe marcarse como error y no enviarse indefinidamente sin control.

---

### BR-011: Los reportes locales incluyen pendientes

Un cambio pendiente de sincronización debe afectar los reportes locales.

---

### BR-012: Los reportes remotos solo incluyen datos aceptados

PostgreSQL solo refleja operaciones validadas por el servidor.

---

### BR-013: El usuario no puede ver datos locales ajenos

Las consultas SQLite siempre deben filtrar por `userId` y `businessId` cuando corresponda.

---

## 12. Casos de uso

## CU-001: Registrar una venta sin internet

### Flujo principal

1. El usuario entra a un negocio.
2. El dispositivo no tiene internet.
3. El usuario registra una venta.
4. La app guarda la venta en SQLite.
5. La app genera una operación pendiente.
6. El resumen del día se actualiza.
7. La app muestra que existe un cambio pendiente.

### Resultado esperado

La venta queda disponible y no se pierde.

---

## CU-002: Sincronizar cuando vuelve internet

### Flujo principal

1. La app detecta conexión.
2. Consulta la cola de operaciones pendientes.
3. Envía las operaciones al backend.
4. El backend valida y guarda en PostgreSQL.
5. El backend confirma las operaciones aceptadas.
6. La app marca esas operaciones como sincronizadas.

### Resultado esperado

Los datos quedan respaldados remotamente.

---

## CU-003: Reintentar una petición

### Flujo principal

1. La app envía una venta.
2. El servidor la guarda.
3. La respuesta no llega al dispositivo.
4. La app reintenta la misma operación.
5. El servidor reconoce el mismo `operationId`.
6. El servidor devuelve el resultado anterior sin duplicar la venta.

### Resultado esperado

Solo existe una venta.

---

## CU-004: Recuperar datos en un dispositivo nuevo

### Flujo principal

1. El usuario instala la app.
2. Inicia sesión.
3. La app obtiene los negocios del usuario.
4. La app descarga la información disponible en PostgreSQL.
5. La app guarda la información en SQLite.
6. El usuario puede volver a trabajar offline.

### Resultado esperado

El usuario recupera la información respaldada.

---

## CU-005: Cerrar sesión con cambios pendientes

### Flujo principal

1. El usuario intenta cerrar sesión.
2. La app detecta cambios pendientes.
3. La app muestra una advertencia.
4. El usuario decide:
   - Sincronizar primero.
   - Cerrar sesión conservando los datos en el dispositivo.
   - Cancelar.

### Resultado esperado

Los cambios no se eliminan accidentalmente.

---

## 13. Casos límite

### CL-001: La app se cierra durante la sincronización

Las operaciones no confirmadas deben continuar pendientes al abrir nuevamente la app.

---

### CL-002: El servidor guarda pero no responde

El reintento no debe generar duplicados.

---

### CL-003: El usuario cambia la hora del dispositivo

La sincronización no debe depender únicamente de la hora local para ordenar cambios.

---

### CL-004: El usuario inicia sesión en dos dispositivos

La versión inicial no garantiza edición simultánea sin conflictos.

La aplicación debe detectar y manejar cambios remotos, pero algunos conflictos descriptivos pueden requerir resolución.

---

### CL-005: Un negocio fue eliminado remotamente

La app no debe seguir sincronizando operaciones nuevas hacia un negocio que ya no está activo.

Las operaciones pendientes deben marcarse para revisión.

---

### CL-006: La sesión expiró mientras estaba offline

El usuario puede continuar consultando y registrando datos locales previamente autorizados.

Cuando vuelva internet, la app debe renovar o validar la sesión antes de sincronizar.

---

### CL-007: El servidor rechaza un monto inválido

La operación debe quedar en estado de error y la app debe informar que necesita corrección.

---

### CL-008: Otro usuario inicia sesión en el mismo dispositivo

Los datos del usuario anterior deben permanecer aislados y no mostrarse.

---

# Parte 2: Enfoque técnico

## 14. Tecnologías involucradas

| Componente | Tecnología |
|---|---|
| Aplicación móvil | React Native + Expo |
| Base local | SQLite |
| Acceso local a datos | Drizzle ORM |
| Backend | Hono |
| Base remota | PostgreSQL |
| Acceso remoto a datos | Drizzle ORM |
| Autenticación | Better Auth |
| Sesiones | Cookies gestionadas para Expo |
| Estado de red | API de conectividad de Expo/React Native |

---

## 15. Arquitectura conceptual

```txt
React Native + Expo
        │
        ├── SQLite
        │     ├── Datos del negocio
        │     ├── Cola de operaciones
        │     └── Estado de sincronización
        │
        ├── Motor de sincronización
        │     ├── Push
        │     ├── Pull
        │     ├── Reintentos
        │     └── Resolución de conflictos
        │
        └── Hono API
              ├── Better Auth
              ├── Autorización por negocio
              ├── Validación de mutaciones
              ├── Registro de cambios
              └── PostgreSQL
```

---

## 16. Entidades sincronizables

Inicialmente:

- `Business`
- `Customer`
- `CashMovement`
- `Credit`
- `CreditPayment`

Más adelante:

- Configuraciones.
- Categorías.
- Miembros del negocio.
- Inventario.
- Notificaciones.

---

## 17. Campos comunes

Toda entidad sincronizable debe incluir:

```ts
interface SyncableEntity {
  id: string;
  userId: string;
  businessId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  version: number;
}
```

### Notas

- `id` se genera en el cliente.
- `version` aumenta en el servidor.
- `deletedAt` soporta eliminación lógica cuando aplique.
- Las fechas del servidor se consideran canónicas después de sincronizar.

---

## 18. Cola local de operaciones

Se recomienda usar una tabla `sync_outbox`.

```ts
type SyncOperation =
  | "CREATE"
  | "UPDATE"
  | "CANCEL"
  | "DELETE";

type SyncStatus =
  | "PENDING"
  | "PROCESSING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT";

interface SyncOutboxItem {
  operationId: string;
  userId: string;
  businessId?: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: string;
  status: SyncStatus;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string | null;
}
```

---

## 19. Estado local de sincronización

Se recomienda una tabla `sync_state`.

```ts
interface SyncState {
  userId: string;
  lastCursor?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastAttemptAt?: string | null;
  lastError?: string | null;
}
```

---

## 20. Flujo de escritura local

La escritura debe hacerse en una transacción SQLite.

Ejemplo:

```txt
BEGIN TRANSACTION

1. Insertar venta en cash_movements
2. Insertar operación en sync_outbox

COMMIT
```

Si falla cualquiera de los dos pasos, ninguno debe quedar aplicado.

---

## 21. Flujo push

El cliente envía operaciones pendientes.

### Endpoint sugerido

```http
POST /sync/push
```

### Solicitud conceptual

```json
{
  "deviceId": "device-uuid",
  "operations": [
    {
      "operationId": "operation-uuid",
      "entityType": "cashMovement",
      "entityId": "movement-uuid",
      "operation": "CREATE",
      "baseVersion": 0,
      "payload": {
        "businessId": "business-uuid",
        "type": "SALE",
        "amount": 15000,
        "movementDate": "2026-07-11T10:00:00-05:00"
      }
    }
  ]
}
```

### Respuesta conceptual

```json
{
  "accepted": [
    {
      "operationId": "operation-uuid",
      "entityId": "movement-uuid",
      "version": 1
    }
  ],
  "rejected": [],
  "conflicts": []
}
```

---

## 22. Idempotencia

El backend debe guardar los `operationId` procesados.

Tabla conceptual:

```ts
interface ProcessedSyncOperation {
  operationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  result: string;
  processedAt: string;
}
```

Si una operación vuelve a llegar, el servidor devuelve el resultado ya registrado.

---

## 23. Flujo pull

El cliente solicita cambios posteriores a su último cursor.

### Endpoint sugerido

```http
GET /sync/pull?cursor=:cursor
```

### Respuesta conceptual

```json
{
  "changes": [
    {
      "changeId": 1051,
      "entityType": "customer",
      "entityId": "customer-uuid",
      "operation": "UPDATE",
      "version": 3,
      "data": {
        "name": "Pedro Pérez",
        "phone": "3000000000"
      }
    }
  ],
  "nextCursor": "1051",
  "hasMore": false
}
```

---

## 24. Registro remoto de cambios

Para soportar pull incremental se recomienda una tabla `sync_change_log`.

```ts
interface SyncChangeLog {
  changeId: number;
  userId: string;
  businessId?: string;
  entityType: string;
  entityId: string;
  operation: string;
  version: number;
  changedAt: string;
}
```

`changeId` debe ser generado por el servidor y avanzar de forma monotónica.

No se debe usar únicamente `updatedAt` como cursor.

---

## 25. Aplicación de cambios remotos

Los cambios recibidos deben aplicarse en una transacción SQLite.

Orden sugerido:

1. Validar el usuario.
2. Ordenar por cursor.
3. Aplicar entidades padre antes que hijas.
4. Actualizar versiones locales.
5. Actualizar `lastCursor`.
6. Confirmar la transacción.

---

## 26. Estrategia de conflictos

## 26.1 Movimientos financieros

Para:

- Ventas.
- Gastos.
- Fiados.
- Abonos.

Se recomienda:

- Crear.
- Anular.
- No editar libremente después de sincronizar.

Esto evita la mayoría de conflictos.

---

## 26.2 Datos descriptivos

Para:

- Nombre del negocio.
- Nombre del cliente.
- Teléfono.
- Notas.

Se usará control optimista con `version`.

Ejemplo:

```txt
Cliente local parte de version = 2
Servidor ya tiene version = 3
La actualización local no se aplica automáticamente
```

El servidor responde con conflicto.

---

## 26.3 Resolución propuesta para MVP

En un conflicto descriptivo:

1. Se conserva la versión del servidor.
2. La operación local queda marcada como `CONFLICT`.
3. La app informa que un cambio no pudo aplicarse.
4. El usuario puede volver a editar usando la versión actual.

No se recomienda usar silenciosamente `last-write-wins` para todo.

---

## 27. Reintentos

Se recomienda reintento con espera progresiva.

Ejemplo:

```txt
Intento 1: inmediato
Intento 2: 10 segundos
Intento 3: 30 segundos
Intento 4: 2 minutos
Intento 5: 10 minutos
```

No se debe reintentar automáticamente de forma infinita cuando el error sea de validación.

---

## 28. Clasificación de errores

### Error temporal

Ejemplos:

- Sin internet.
- Timeout.
- Servidor no disponible.
- Error 500.

Acción:

```txt
Conservar como PENDING y reintentar.
```

### Error permanente

Ejemplos:

- Monto inválido.
- Negocio inexistente.
- Usuario sin permisos.
- Datos incompletos.

Acción:

```txt
Marcar como FAILED y solicitar corrección.
```

### Conflicto

Ejemplo:

- Versión remota diferente.

Acción:

```txt
Marcar como CONFLICT.
```

---

## 29. Autenticación y sesión

Better Auth se encarga de autenticar al usuario con:

- Correo y contraseña.
- Google Auth.
- Sesiones basadas en cookies.

En Expo, la sesión debe persistirse de forma segura según la integración elegida.

Para sincronizar:

1. La app obtiene o adjunta la cookie de sesión.
2. Hono valida la sesión con Better Auth.
3. El backend obtiene el usuario autenticado.
4. El backend valida el acceso al negocio.
5. Solo después procesa operaciones.

---

## 30. Sesión expirada

Si la sesión expira:

- La app puede continuar trabajando localmente para el usuario previamente autenticado.
- La sincronización se pausa.
- Cuando vuelve la conexión, la app solicita renovar o iniciar sesión.
- Los cambios pendientes permanecen en SQLite.

---

## 31. Datos locales por usuario

Todas las tablas locales deben incluir `userId` cuando sea necesario.

Ejemplo:

```sql
SELECT *
FROM cash_movements
WHERE user_id = :userId
  AND business_id = :businessId;
```

No se debe asumir que el dispositivo solo tendrá un usuario.

---

## 32. Cierre de sesión

Al cerrar sesión:

- Se elimina la sesión de Better Auth.
- Los datos locales no se eliminan automáticamente.
- Los datos quedan asociados al usuario.
- Otro usuario no puede consultarlos.
- Si el mismo usuario vuelve a iniciar sesión, puede recuperar el acceso local.

Una opción futura podrá permitir:

```txt
Cerrar sesión y borrar datos de este dispositivo
```

---

## 33. Seguridad local

SQLite no debe considerarse automáticamente cifrado.

Para el MVP se debe:

- Evitar guardar contraseñas.
- No guardar secretos OAuth.
- Mantener cookies o tokens en almacenamiento seguro.
- Restringir datos por usuario.
- Evaluar cifrado local en una fase posterior si el riesgo lo requiere.

---

## 34. Estructura sugerida en la aplicación

```txt
src/
  modules/
    sync/
      sync-engine.ts
      sync-push.ts
      sync-pull.ts
      sync-retry.ts
      sync-conflicts.ts
      sync.repository.ts
      sync.types.ts

  db/
    sqlite.ts
    schema/
      businesses.ts
      customers.ts
      cash-movements.ts
      credits.ts
      credit-payments.ts
      sync-outbox.ts
      sync-state.ts
```

---

## 35. Estructura sugerida en Hono

```txt
src/
  modules/
    sync/
      sync.routes.ts
      sync.service.ts
      sync.repository.ts
      sync.schemas.ts
      sync.types.ts

    businesses/
    customers/
    cash/
    credits/
```

---

## 36. Transacciones en PostgreSQL

Cada operación push debe procesarse en una transacción:

```txt
BEGIN

1. Validar operationId
2. Validar usuario y negocio
3. Validar versión
4. Aplicar cambio
5. Guardar operationId procesado
6. Registrar cambio en sync_change_log

COMMIT
```

---

## 37. Endpoints sugeridos

### Enviar cambios

```http
POST /sync/push
```

### Descargar cambios

```http
GET /sync/pull?cursor=:cursor
```

### Estado remoto

```http
GET /sync/status
```

### Sincronización inicial

```http
GET /sync/bootstrap
```

`bootstrap` permite descargar los datos completos del usuario en un dispositivo nuevo.

---

## 38. Criterios de aceptación

### CA-001: Venta offline

Dado que no hay internet,

Cuando el usuario registra una venta,

Entonces:

- La venta se guarda en SQLite.
- Aparece en el historial.
- Afecta el resumen local.
- Queda pendiente de sincronización.

---

### CA-002: Recuperación después de cerrar la app

Dada una venta pendiente,

Cuando la aplicación se cierra y vuelve a abrir,

Entonces la venta continúa disponible y pendiente.

---

### CA-003: Reintento sin duplicado

Dado que el servidor ya procesó una operación pero la app no recibió respuesta,

Cuando la app la reenvía,

Entonces el servidor no crea un duplicado.

---

### CA-004: Sincronización exitosa

Dada una operación pendiente y conexión disponible,

Cuando la sincronización termina correctamente,

Entonces la operación se marca como sincronizada.

---

### CA-005: Sesión expirada

Dada una sesión expirada y cambios locales pendientes,

Cuando la app intenta sincronizar,

Entonces:

- No elimina los cambios.
- Solicita autenticación.
- Reanuda la sincronización después de autenticar.

---

### CA-006: Aislamiento por usuario

Dado que un segundo usuario inicia sesión en el mismo dispositivo,

Cuando entra a la aplicación,

Entonces no ve los negocios ni movimientos del usuario anterior.

---

### CA-007: Recuperación en dispositivo nuevo

Dado un usuario con datos respaldados,

Cuando inicia sesión en otro dispositivo,

Entonces puede descargar sus negocios y operaciones confirmadas.

---

## 39. Fases sugeridas de implementación

### Fase 1: Persistencia local

- SQLite.
- Drizzle.
- Operaciones offline.
- Reportes locales.
- Sin sincronización remota.

### Fase 2: Push y respaldo

- Cola local.
- `POST /sync/push`.
- Idempotencia.
- Reintentos.
- PostgreSQL como respaldo.

### Fase 3: Recuperación

- Bootstrap de datos.
- Descarga inicial en otro dispositivo.
- Restauración local.

### Fase 4: Pull incremental

- Cursor remoto.
- Registro de cambios.
- Descarga incremental.

### Fase 5: Conflictos y varios dispositivos

- Versionado.
- Conflictos descriptivos.
- Mejoras para uso simultáneo.

---

## 40. Decisiones pendientes

- Definir si el MVP permitirá iniciar sesión y editar desde varios dispositivos al mismo tiempo.
- Definir si se impondrá un dispositivo principal por usuario durante el MVP.
- Definir cuándo ejecutar sincronización automática.
- Definir tamaño máximo de cada lote de operaciones.
- Definir política de eliminación de datos locales.
- Definir si se implementará cifrado de SQLite.
- Definir cuánto tiempo conservar el historial de operaciones procesadas.
- Definir cómo se mostrará una operación rechazada al usuario.
- Definir si el modo offline permitirá crear un negocio nuevo.
- Definir si el cierre de sesión con cambios pendientes se permitirá sin advertencia adicional.

---

## 41. Definición de terminado

Este módulo se considera terminado cuando:

- Las operaciones principales funcionan sin internet.
- Toda escritura se guarda primero en SQLite.
- Los cambios pendientes sobreviven al cierre de la app.
- Las operaciones pueden enviarse al servidor.
- Los reintentos no generan duplicados.
- La app puede descargar datos remotos.
- Los reportes incluyen cambios locales pendientes.
- Los datos están aislados por usuario y negocio.
- La sesión expirada no elimina información local.
- Los errores de sincronización son visibles y recuperables.
