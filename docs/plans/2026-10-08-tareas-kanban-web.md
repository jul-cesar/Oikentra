# Tareas Kanban web — Plan de implementación

> **Para agentes de implementación:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Las casillas `- [ ]` registran el avance.

**Estado:** Completado

**Objetivo:** Crear un módulo web de tareas compartidas con tablero Kanban, responsable único opcional, comentarios, adjuntos privados y proyección de vencimientos en Agenda.

**Arquitectura:** `business-service` será propietario de tareas, comentarios y adjuntos porque ya contiene integrantes, permisos, Agenda y acceso a R2. Web consumirá una API REST específica y ofrecerá un tablero de tres columnas más una vista de detalle. Agenda consultará directamente las tareas con fecha límite y las expondrá como elementos `TASK`; no se crearán eventos duplicados.

**Stack:** Bun, Hono, Drizzle ORM, PostgreSQL, Cloudflare R2 mediante AWS SDK S3, Next.js, React, TanStack Query, Zod y componentes existentes.

**Especificación:** `docs/18-tareas-kanban-y-colaboracion.md`

## Restricciones globales

- Implementar únicamente web; no modificar `apps/mobile`.
- Estados fijos: `TODO`, `IN_PROGRESS`, `DONE`.
- Prioridades fijas: `LOW`, `MEDIUM`, `HIGH`.
- Una tarea admite cero o un responsable.
- Todos los integrantes activos pueden ver el tablero, crear, comentar y adjuntar.
- Solo `OWNER` y `MANAGER` pueden asignar a otras personas o eliminar tareas.
- Un `OPERATOR` solo puede autoasignarse una tarea sin responsable y cambiar el estado de sus tareas.
- Usar el componente existente `apps/web/components/reui/kanban.tsx` para mover tarjetas entre columnas mediante drag-and-drop.
- El drag-and-drop solo cambia el estado: no agregar reordenamiento manual de tarjetas o columnas, subtareas, recurrencia, menciones ni notificaciones.
- Mantener una acción accesible alternativa para cambiar estado sin arrastrar.
- Los adjuntos deben almacenarse en un bucket privado; nunca usar `R2_PUBLIC_BASE_URL` para servirlos.
- No aceptar SVG, ejecutables, archivos mayores de 10 MB ni más de 10 adjuntos por tarea.
- No agregar dependencias de interfaz nuevas.

## Enfoque de revisión

- Un `memberId` de otro negocio o inactivo debe rechazarse en creación, edición y asignación.
- Dos actualizaciones con la misma versión deben producir un conflicto en la segunda, no sobrescribir silenciosamente.
- El tablero debe actualizarse optimísticamente durante el movimiento y recargar el estado canónico ante rechazo, conflicto o error de red.
- Los operadores no deben poder asignar a terceros, editar tareas ajenas ni cambiar estados de tareas no asignadas a ellos.
- Un objeto de R2 no confirmado, con tamaño o tipo distinto al declarado, no debe convertirse en adjunto visible.
- Agenda debe mostrar tareas con vencimiento una sola vez y reflejar `DONE`, cambios de fecha y eliminaciones sin crear `business_events`.

---

### Task 1: Crear persistencia y configuración privada de archivos

**Archivos:**
- Modificar: `apps/business-service/src/db/schema.ts`
- Crear: `apps/business-service/drizzle/0014_tasks.sql`
- Modificar: `apps/business-service/src/config/config.ts`
- Modificar: `apps/business-service/src/config/config.test.ts`

**Interfaces:**
- Produce: tablas `tasks`, `task_comments`, `task_attachments` y configuración opcional `r2PrivateBucket`.
- Consume: credenciales R2 existentes `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

- [x] **Paso 1: Escribir pruebas fallidas de configuración**

Agregar casos que demuestren:

- `R2_PRIVATE_BUCKET` se expone solo cuando existen cuenta, credenciales y nombre de bucket;
- la configuración privada no depende de `R2_PUBLIC_BASE_URL`;
- la configuración de logos conserva su comportamiento actual.

- [x] **Paso 2: Ejecutar las pruebas para comprobar que fallan**

```bash
bun test apps/business-service/src/config/config.test.ts
```

Resultado esperado: fallan los casos nuevos porque `r2PrivateBucket` aún no existe.

- [x] **Paso 3: Definir tablas, enums e índices**

En `schema.ts`, agregar:

- `taskStatuses = ["TODO", "IN_PROGRESS", "DONE"]`;
- `taskPriorities = ["LOW", "MEDIUM", "HIGH"]`;
- tabla `tasks` con los campos aprobados en la especificación;
- tabla `task_comments` con referencia `taskId` y borrado en cascada;
- tabla `task_attachments` con referencia `taskId` y borrado en cascada;
- índices por negocio/estado, negocio/responsable, negocio/vencimiento, tarea/comentarios y tarea/adjuntos;
- columna `version` en tareas con valor inicial `1`.

`assigneeMemberId` debe referenciar `business_members.id` y usar `ON DELETE SET NULL`.

- [x] **Paso 4: Crear migración Drizzle**

Generar o escribir `0014_tasks.sql` con las tres tablas, restricciones e índices. No modificar migraciones anteriores.

- [x] **Paso 5: Implementar configuración del bucket privado**

Leer `R2_PRIVATE_BUCKET` sin reutilizar el bucket público como fallback. Cuando falte, las funciones de adjuntos deberán poder responder después con `503 TASK_ATTACHMENTS_NOT_CONFIGURED` sin impedir el resto del módulo de tareas.

- [x] **Paso 6: Verificar persistencia y configuración**

```bash
bun test apps/business-service/src/config/config.test.ts
pnpm --filter @oikentra/business-service typecheck
```

Resultado esperado: pruebas y typecheck pasan.

- [x] **Paso 7: Commit**

```bash
git add apps/business-service/src/db/schema.ts apps/business-service/drizzle/0014_tasks.sql apps/business-service/src/config/config.ts apps/business-service/src/config/config.test.ts
git commit -m "feat(tasks): add task persistence"
```

---

### Task 2: Implementar permisos y dominio principal de tareas

**Archivos:**
- Modificar: `apps/business-service/src/modules/businesses/members.service.ts`
- Modificar: `apps/business-service/src/modules/businesses/members.repository.ts`
- Modificar: `apps/business-service/src/modules/businesses/businesses.service.test.ts`
- Crear: `apps/business-service/src/modules/tasks/tasks.schemas.ts`
- Crear: `apps/business-service/src/modules/tasks/tasks.repository.ts`
- Crear: `apps/business-service/src/modules/tasks/tasks.service.ts`
- Crear: `apps/business-service/src/modules/tasks/tasks.service.test.ts`
- Crear: `apps/business-service/src/modules/tasks/types/tasks.types.ts`

**Interfaces:**
- Produce permisos `tasks.read`, `tasks.create`, `tasks.comment`, `tasks.attach`, `tasks.manage`.
- Produce métodos `list`, `get`, `create`, `update`, `changeStatus`, `assign` y `remove` en `tasksService`.
- Consume: integrante autenticado obtenido mediante `membersService.requirePermission`.

- [x] **Paso 1: Escribir pruebas fallidas de permisos y reglas**

Cubrir:

- todos los roles activos pueden listar y crear;
- un operador puede crear sin responsable o asignarse a sí mismo;
- un operador no puede asignar a otra persona;
- `OWNER` y `MANAGER` pueden asignar a cualquier integrante activo del mismo negocio;
- un responsable puede cambiar el estado de su tarea;
- un operador no puede cambiar una tarea ajena;
- creador operador puede editar su tarea no completada;
- una versión obsoleta devuelve `409 TASK_VERSION_CONFLICT`;
- completar establece `completedAt` y reabrir lo limpia;
- eliminar requiere `tasks.manage`;
- integrante inactivo o de otro negocio devuelve error de validación.

- [x] **Paso 2: Ejecutar pruebas para comprobar que fallan**

```bash
bun test apps/business-service/src/modules/tasks/tasks.service.test.ts
```

Resultado esperado: falla porque el módulo no existe.

- [x] **Paso 3: Agregar permisos por rol**

`OWNER` y `MANAGER` reciben todos los permisos de tareas. `OPERATOR` recibe lectura, creación, comentarios y adjuntos; las operaciones contextuales de autoasignación y cambio de estado se validan en `tasksService`, no mediante confianza en el cliente.

Agregar un permiso de lectura de integrantes activos disponible para todos los roles sin conceder `members.manage`, para que el tablero pueda resolver responsables.

- [x] **Paso 4: Implementar esquemas y tipos**

Definir entradas exactas:

- `CreateTaskInput`: título, descripción opcional, prioridad, responsable opcional y vencimiento opcional;
- `UpdateTaskInput`: versión obligatoria y campos editables;
- `ChangeTaskStatusInput`: versión y estado;
- `AssignTaskInput`: versión y `assigneeMemberId` nullable;
- filtros: estado, prioridad, responsable, `mine`, `unassigned` y búsqueda.

- [x] **Paso 5: Implementar repositorio y servicio**

Todas las consultas deben incluir `businessId`. Las actualizaciones deben comparar `id`, `businessId` y `version`, incrementar la versión y distinguir conflicto de recurso inexistente.

Cuando se desactive un integrante, `members.repository.deactivate` debe desasignar sus tareas dentro de la misma transacción.

- [x] **Paso 6: Ejecutar pruebas y typecheck**

```bash
bun test apps/business-service/src/modules/tasks/tasks.service.test.ts apps/business-service/src/modules/businesses/businesses.service.test.ts
pnpm --filter @oikentra/business-service typecheck
```

Resultado esperado: todo pasa.

- [x] **Paso 7: Commit**

```bash
git add apps/business-service/src/modules/tasks apps/business-service/src/modules/businesses/members.service.ts apps/business-service/src/modules/businesses/members.repository.ts apps/business-service/src/modules/businesses/businesses.service.test.ts
git commit -m "feat(tasks): add task domain and permissions"
```

---

### Task 3: Implementar comentarios y adjuntos privados

**Archivos:**
- Crear: `apps/business-service/src/storage/r2-client.ts`
- Modificar: `apps/business-service/src/modules/businesses/logo-upload.service.ts`
- Crear: `apps/business-service/src/modules/tasks/task-collaboration.service.ts`
- Crear: `apps/business-service/src/modules/tasks/task-collaboration.service.test.ts`
- Modificar: `apps/business-service/src/modules/tasks/tasks.repository.ts`
- Modificar: `apps/business-service/src/modules/tasks/tasks.schemas.ts`
- Modificar: `apps/business-service/src/modules/tasks/types/tasks.types.ts`

**Interfaces:**
- Produce métodos para listar/crear comentarios, solicitar/confirmar cargas, firmar descargas y eliminar adjuntos.
- Produce helper R2 compartido para `PutObject`, `GetObject`, `HeadObject` y `DeleteObject`.
- Consume: `tasks.comment`, `tasks.attach`, `tasks.manage` y acceso de lectura a la tarea.

- [x] **Paso 1: Escribir pruebas fallidas de colaboración y seguridad**

Cubrir:

- comentario vacío o mayor al límite se rechaza;
- cualquier integrante activo del negocio puede comentar;
- usuario externo no puede listar comentarios ni adjuntos;
- solo JPEG, PNG, WebP y PDF generan una carga;
- tamaño mayor a 10 MB o undécimo adjunto se rechaza;
- la clave tiene forma `task-attachments/{businessId}/{taskId}/{uuid}.{ext}`;
- confirmación usa `HeadObject` y rechaza diferencias de tamaño o tipo;
- descarga devuelve URL firmada y nunca `publicBaseUrl`;
- solo `OWNER` y `MANAGER` pueden eliminar adjuntos;
- una confirmación con tamaño o tipo inválido elimina el objeto rechazado de R2;
- la eliminación de tarea se detiene si R2 falla y puede reintentarse.

- [x] **Paso 2: Ejecutar pruebas para comprobar que fallan**

```bash
bun test apps/business-service/src/modules/tasks/task-collaboration.service.test.ts
```

- [x] **Paso 3: Extraer cliente R2 compartido**

Mover únicamente la creación reutilizable de `S3Client` a `storage/r2-client.ts`. Mantener intacta la API pública de logos y sus URLs públicas. Las tareas deben seleccionar exclusivamente `R2_PRIVATE_BUCKET`.

- [x] **Paso 4: Implementar comentarios**

Los comentarios se crean como registros inmutables y se devuelven en orden ascendente por `createdAt`, incluyendo `authorUserId`.

- [x] **Paso 5: Implementar ciclo de adjuntos**

La solicitud de carga genera una clave controlada por servidor y URL firmada de cinco minutos, vinculando `Content-Type` y `Content-Length` esperados. La confirmación verifica el objeto antes de insertar metadatos y elimina cualquier objeto que no coincida. La descarga genera una URL firmada de corta duración. La eliminación borra primero R2 y después los metadatos.

- [x] **Paso 6: Ejecutar pruebas y typecheck**

```bash
bun test apps/business-service/src/modules/tasks/task-collaboration.service.test.ts
pnpm --filter @oikentra/business-service typecheck
```

- [x] **Paso 7: Commit**

```bash
git add apps/business-service/src/storage apps/business-service/src/modules/tasks apps/business-service/src/modules/businesses/logo-upload.service.ts
git commit -m "feat(tasks): add comments and private attachments"
```

---

### Task 4: Publicar API y cliente web

**Archivos:**
- Crear: `apps/business-service/src/modules/tasks/tasks.routes.ts`
- Modificar: `apps/business-service/src/app.ts`
- Modificar: `apps/business-service/src/index.test.ts`
- Crear: `apps/web/lib/tasks-api.ts`
- Crear: `apps/web/lib/queries/tasks.ts`
- Crear: `apps/web/lib/validation/tasks-schemas.ts`

**Interfaces:**
- Produce API base `/api/business/businesses/:businessId/tasks`.
- Produce hooks TanStack Query para tareas, detalle, comentarios y adjuntos.

- [x] **Paso 1: Escribir pruebas fallidas de registro de rutas**

Agregar casos de humo para confirmar que las rutas de tareas están montadas, requieren autenticación interna y devuelven el sobre estándar `{ data }` o errores con código.

- [x] **Paso 2: Implementar rutas REST**

Incluir:

- `GET /` y `POST /`;
- `GET /:taskId`, `PATCH /:taskId`, `DELETE /:taskId`;
- `POST /:taskId/status` y `POST /:taskId/assignee`;
- `GET /:taskId/comments` y `POST /:taskId/comments`;
- `GET /:taskId/attachments`;
- `POST /:taskId/attachments/upload`;
- `POST /:taskId/attachments/confirm`;
- `GET /:taskId/attachments/:attachmentId/download`;
- `DELETE /:taskId/attachments/:attachmentId`.

- [x] **Paso 3: Implementar cliente y hooks web**

Usar claves de consulta bajo `tasks`. Toda mutación debe invalidar lista, detalle y Agenda cuando cambie estado o fecha límite. Comentarios y adjuntos invalidan únicamente el detalle relacionado. La mutación de estado debe admitir el tablero optimista y, ante error, invalidar y recargar en lugar de restaurar una instantánea que pueda sobrescribir un movimiento posterior.

- [x] **Paso 4: Ejecutar verificaciones**

```bash
bun test apps/business-service/src/index.test.ts
pnpm --filter @oikentra/business-service typecheck
pnpm --filter @oikentra/web typecheck
```

- [x] **Paso 5: Commit**

```bash
git add apps/business-service/src/modules/tasks/tasks.routes.ts apps/business-service/src/app.ts apps/business-service/src/index.test.ts apps/web/lib/tasks-api.ts apps/web/lib/queries/tasks.ts apps/web/lib/validation/tasks-schemas.ts
git commit -m "feat(tasks): expose task API and web client"
```

---

### Task 5: Construir el tablero Kanban web

**Archivos:**
- Crear: `apps/web/app/dashboard/[businessId]/tareas/page.tsx`
- Crear: `apps/web/components/dashboard/tasks/tasks-page.tsx`
- Crear: `apps/web/components/dashboard/tasks/task-board.tsx`
- Crear: `apps/web/components/dashboard/tasks/task-card.tsx`
- Crear: `apps/web/components/dashboard/tasks/create-task-dialog.tsx`
- Modificar: `apps/web/components/app-sidebar.tsx`

**Interfaces:**
- Consume: hooks de la Tarea 4 y consulta existente de integrantes activos.
- Produce: ruta `/dashboard/[businessId]/tareas` y cambios de estado mediante drag-and-drop optimista.

- [x] **Paso 1: Crear contenedor autenticado y navegación**

Seguir el patrón de `DashboardShell`, agregar `Tareas` al menú y usar `Cargando tareas` en el estado inicial.

- [x] **Paso 2: Crear formulario de tarea**

Campos: título, descripción, prioridad, responsable opcional y fecha límite opcional. Para operadores, el selector solo permite `Sin asignar` o su propio integrante; propietarios y administradores ven todos los integrantes activos.

- [x] **Paso 3: Crear filtros y búsqueda**

Implementar `Todas`, `Mis tareas`, `Sin asignar`, integrante, prioridad y búsqueda. Conservar filtros en query string para permitir enlaces compartibles.

- [x] **Paso 4: Crear las tres columnas y el movimiento optimista**

Renderizar `Pendiente`, `En curso` y `Completada` con `Kanban`, `KanbanBoard`, `KanbanColumn`, `KanbanColumnContent`, `KanbanItem`, `KanbanItemHandle` y `KanbanOverlay` desde `apps/web/components/reui/kanban.tsx`. Ordenar por vencimiento ascendente y creación descendente. Cada tarjeta debe mostrar los metadatos aprobados y un menú accesible para cambiar estado cuando el usuario tenga permiso.

Mantener `value` y `onValueChange` para la previsualización optimista y persistir una sola vez desde `onValueCommit`. Solo los movimientos entre columnas producen una mutación de estado con la versión actual. Un movimiento dentro de la misma columna restaura el orden canónico; las columnas no son reordenables. Ante error, conflicto o rechazo de permisos, invalidar y recargar tablero, detalle y Agenda, además de mostrar un mensaje accionable.

- [x] **Paso 5: Crear estados de carga, error y vacío**

El error ofrece `Reintentar`; el estado vacío mantiene visible `Nueva tarea`. Una columna vacía conserva su encabezado y explica qué tipo de tarea aparecerá allí.

- [x] **Paso 6: Verificar tablero**

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Comprobación manual: crear tareas asignadas y sin asignar, aplicar filtros, arrastrar tarjetas entre estados con distintos roles, comprobar la actualización optimista y su recuperación ante error, cambiar estado sin arrastrar y abrir una tarjeta mediante teclado.

- [x] **Paso 7: Commit**

```bash
git add apps/web/app/dashboard/[businessId]/tareas/page.tsx apps/web/components/dashboard/tasks apps/web/components/app-sidebar.tsx
git commit -m "feat(web): add task kanban board"
```

---

### Task 6: Construir detalle, comentarios y adjuntos web

**Archivos:**
- Crear: `apps/web/app/dashboard/[businessId]/tareas/[taskId]/page.tsx`
- Crear: `apps/web/components/dashboard/tasks/task-detail.tsx`
- Crear: `apps/web/components/dashboard/tasks/task-comments.tsx`
- Crear: `apps/web/components/dashboard/tasks/task-attachments.tsx`

**Interfaces:**
- Consume: API y permisos calculados por backend.
- Produce: detalle enlazable, conversación cronológica y carga/descarga privada.

- [x] **Paso 1: Crear vista de detalle**

Mostrar datos, responsable, prioridad, vencimiento, estado y acciones permitidas. Ante `TASK_VERSION_CONFLICT`, recargar la tarea y avisar que otro integrante la modificó.

- [x] **Paso 2: Crear comentarios**

Mostrar autor, fecha y contenido; agregar formulario de comentario sin edición ni hilos.

- [x] **Paso 3: Crear adjuntos**

Usar `<input type="file">` con JPEG, PNG, WebP y PDF. Validar tamaño antes de solicitar la carga, subir a la URL firmada y confirmar después. Mostrar miniatura para imágenes y enlace para PDF; descargar siempre mediante URL firmada solicitada al abrir.

- [x] **Paso 4: Manejar fallos de carga**

Una carga fallida o sin confirmar no debe aparecer. Mostrar error accionable y permitir reintentar sin duplicar metadatos.

- [ ] **Paso 5: Verificar colaboración**

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Comprobación manual con dos usuarios: comentar, adjuntar, descargar, cambiar estado y confirmar actualización del tablero.

- [x] **Paso 6: Commit**

```bash
git add apps/web/app/dashboard/[businessId]/tareas/[taskId]/page.tsx apps/web/components/dashboard/tasks
git commit -m "feat(web): add task collaboration detail"
```

---

### Task 7: Proyectar vencimientos en Agenda

**Archivos:**
- Modificar: `apps/business-service/src/modules/agenda/agenda.repository.ts`
- Modificar: `apps/business-service/src/modules/agenda/agenda.service.ts`
- Modificar: `apps/business-service/src/modules/agenda/agenda.service.test.ts`
- Modificar: `apps/web/lib/agenda-api.ts`
- Modificar: `apps/web/components/dashboard/agenda/agenda-page.tsx`

**Interfaces:**
- Produce: `AgendaItem.source = "TASK"` y `taskId` para navegación.
- Consume: tareas con `dueAt` dentro del rango solicitado.

- [x] **Paso 1: Escribir pruebas fallidas de Agenda**

Cubrir:

- tarea sin vencimiento no aparece;
- `TODO` e `IN_PROGRESS` futuros son `SCHEDULED`;
- vencida no completada es `OVERDUE`;
- `DONE` es `COMPLETED`;
- la tarea se representa una sola vez, como elemento de día completo y `readOnly`;
- pertenece al negocio solicitado y respeta el rango.

- [x] **Paso 2: Ejecutar pruebas para comprobar que fallan**

```bash
bun test apps/business-service/src/modules/agenda/agenda.service.test.ts
```

- [x] **Paso 3: Agregar consulta y mapeo**

Consultar tareas directamente desde Agenda; no insertar `business_events`. Añadir `taskId`, título, descripción y estado normalizado al resultado.

- [x] **Paso 4: Actualizar cliente y navegación web**

Extender el tipo `AgendaItem` con `TASK`. Al seleccionar una tarea, navegar a `/dashboard/{businessId}/tareas/{taskId}`; no abrir el editor de eventos.

- [x] **Paso 5: Ejecutar verificación final**

```bash
bun test apps/business-service/src/modules/tasks/tasks.service.test.ts apps/business-service/src/modules/tasks/task-collaboration.service.test.ts apps/business-service/src/modules/agenda/agenda.service.test.ts apps/business-service/src/index.test.ts
pnpm --filter @oikentra/business-service typecheck
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Resultado esperado: todos los comandos terminan con código `0`.

Comprobación manual: crear tarea con vencimiento, verla en Agenda, completarla, cambiar la fecha y eliminarla; Agenda debe reflejar cada cambio sin registros duplicados.

- [x] **Paso 6: Actualizar estado documental**

Cambiar este plan y `docs/plans/README.md` a **Completado** después de verificar todos los criterios.

- [x] **Paso 7: Commit**

```bash
git add apps/business-service/src/modules/agenda apps/web/lib/agenda-api.ts apps/web/components/dashboard/agenda/agenda-page.tsx docs/plans
git commit -m "feat(tasks): show task deadlines in agenda"
```

## Criterio de cierre

El plan se considera completado cuando el tablero compartido funciona para los tres roles, los permisos contextuales están probados, comentarios y adjuntos privados operan sin exposición pública, Agenda refleja vencimientos directamente y ninguna modificación alcanza `apps/mobile`.
