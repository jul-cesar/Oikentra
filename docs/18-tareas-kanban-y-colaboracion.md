# 18 - Tareas Kanban y colaboración

## Estado del documento

- **Estado:** Diseño aprobado
- **Plataforma inicial:** Web
- **Aplicación móvil:** En standby y fuera de este alcance
- **Servicio propietario:** `business-service`

## 1. Propósito

Oikentra incorporará una sección **Tareas** para que los integrantes de un negocio puedan registrar, organizar, asignar y completar trabajo operativo. La experiencia principal será un tablero Kanban compartido y las tareas con fecha límite también aparecerán en la Agenda.

El módulo debe permitir colaboración real mediante comentarios y archivos adjuntos sin convertirse inicialmente en una herramienta completa de gestión de proyectos.

## 2. Decisiones aprobadas

- El módulo será independiente de Agenda.
- Agenda mostrará una proyección de las tareas con fecha límite; no duplicará tareas como eventos.
- El tablero será compartido por todos los integrantes activos del negocio.
- Cada tarea tendrá como máximo un responsable.
- El responsable será opcional para permitir tareas sin asignar.
- Todos podrán filtrar por **Todas**, **Mis tareas**, **Sin asignar** y por integrante.
- Todos los integrantes activos podrán crear tareas, comentar y adjuntar archivos.
- Propietarios y administradores podrán asignar tareas a cualquier integrante y eliminar tareas.
- Los operadores podrán crear tareas sin asignar, asignárselas a sí mismos y cambiar el estado de las tareas que tengan asignadas.
- La primera versión será exclusivamente web.
- Las tarjetas podrán moverse entre columnas mediante drag-and-drop para cambiar de estado, con actualización optimista y persistencia al finalizar el movimiento.
- El menú accesible para cambiar estado se conservará como alternativa al drag-and-drop.

## 3. Alcance funcional

### 3.1 Tablero Kanban

El tablero tendrá tres columnas fijas:

1. **Pendiente**
2. **En curso**
3. **Completada**

Cada tarjeta mostrará como mínimo:

- título;
- prioridad;
- responsable o estado **Sin asignar**;
- fecha límite, cuando exista;
- indicador de vencimiento;
- cantidad de comentarios;
- cantidad de adjuntos.

La primera versión permitirá cambiar el estado arrastrando una tarjeta entre columnas y desde una acción accesible en la tarjeta. El tablero actualizará su estado de forma optimista y persistirá el cambio una sola vez al finalizar el movimiento. No se permitirá reordenar columnas ni conservar un orden manual dentro de una columna.

### 3.2 Datos de una tarea

Cada tarea tendrá:

- negocio;
- título obligatorio;
- descripción opcional;
- estado: `TODO`, `IN_PROGRESS` o `DONE`;
- prioridad: `LOW`, `MEDIUM` o `HIGH`;
- responsable opcional;
- creador;
- fecha límite opcional;
- fecha de finalización, cuando corresponda;
- versión para controlar actualizaciones concurrentes;
- fechas de creación y actualización.

No se incluirán subtareas, etiquetas, dependencias, recurrencia ni estimaciones en la primera versión.

### 3.3 Comentarios

Los integrantes activos podrán agregar comentarios de texto a cualquier tarea visible del negocio.

Cada comentario registrará:

- tarea;
- autor;
- contenido;
- fecha de creación.

Los comentarios serán cronológicos e inmutables en la primera versión. No habrá respuestas anidadas, menciones, reacciones ni edición.

### 3.4 Archivos adjuntos

Las tareas admitirán imágenes y documentos:

- JPEG;
- PNG;
- WebP;
- PDF.

Restricciones iniciales:

- máximo 10 MB por archivo;
- máximo 10 adjuntos por tarea;
- no se admitirán SVG ni archivos ejecutables;
- los objetos serán privados y estarán aislados por negocio y tarea.

Los archivos se guardarán en Cloudflare R2 mediante el cliente S3 que ya utiliza `business-service`. La base de datos almacenará únicamente metadatos y la clave del objeto.

El flujo será:

1. el cliente solicita una URL firmada de carga;
2. el servicio valida negocio, tarea, permisos, tipo y tamaño declarado;
3. el navegador carga directamente a R2;
4. el cliente confirma la carga;
5. el servicio verifica el objeto y registra el adjunto;
6. la descarga utiliza una URL firmada de corta duración.

No se reutilizará la URL pública de logos para archivos de tareas.

### 3.5 Filtros y búsqueda

El tablero ofrecerá:

- **Todas**;
- **Mis tareas**;
- **Sin asignar**;
- filtro por integrante;
- filtro por prioridad;
- búsqueda por título y descripción.

Las tareas se ordenarán dentro de cada columna por fecha límite ascendente y luego por fecha de creación descendente. No habrá orden manual en la primera versión: un movimiento dentro de la misma columna se descartará y restaurará el orden canónico.

## 4. Permisos

### 4.1 Propietario y administrador

Podrán:

- ver todas las tareas;
- crear tareas;
- editar cualquier tarea;
- asignar o reasignar a cualquier integrante activo;
- cambiar cualquier estado;
- comentar y adjuntar archivos;
- eliminar tareas y adjuntos.

### 4.2 Operador

Podrá:

- ver el tablero completo;
- crear tareas sin responsable o asignadas a sí mismo;
- asignarse una tarea que esté sin responsable;
- editar las tareas que haya creado mientras no estén completadas;
- cambiar el estado de las tareas asignadas a sí mismo;
- comentar y adjuntar archivos en cualquier tarea visible;
- usar el filtro **Mis tareas**.

No podrá asignar tareas a otras personas, editar tareas ajenas ni eliminar tareas.

### 4.3 Integrantes válidos

Solo un integrante con estado `ACTIVE` y perteneciente al mismo negocio podrá ser responsable. Si un integrante se desactiva, sus tareas se conservarán y quedarán sin responsable.

La consulta de integrantes activos debe estar disponible para todos los integrantes del negocio sin conceder permisos para gestionar roles o invitaciones.

## 5. Modelo de datos

### 5.1 `tasks`

Campos principales:

- `id`;
- `business_id`;
- `created_by_user_id`;
- `assignee_member_id`, nullable;
- `title`;
- `description`, nullable;
- `status`;
- `priority`;
- `due_at`, nullable;
- `completed_at`, nullable;
- `version`;
- `created_at`;
- `updated_at`.

Índices principales:

- negocio y estado;
- negocio y responsable;
- negocio y fecha límite.

### 5.2 `task_comments`

Campos principales:

- `id`;
- `business_id`;
- `task_id`;
- `author_user_id`;
- `body`;
- `created_at`.

### 5.3 `task_attachments`

Campos principales:

- `id`;
- `business_id`;
- `task_id`;
- `uploaded_by_user_id`;
- `object_key`;
- `file_name`;
- `content_type`;
- `size_bytes`;
- `created_at`.

Al eliminar una tarea, el servicio borrará primero sus objetos de R2 y tratará una clave inexistente como éxito para permitir reintentos. Si R2 falla, la eliminación se detendrá y los registros permanecerán disponibles para reintentar. Cuando todos los objetos se hayan eliminado, la tarea, sus comentarios y los metadatos de adjuntos se eliminarán en una transacción.

## 6. API

Base propuesta:

`/api/business/businesses/:businessId/tasks`

Operaciones:

- listar tareas con filtros;
- crear tarea;
- obtener detalle;
- editar tarea;
- cambiar estado;
- asignar o desasignar;
- eliminar tarea;
- listar y crear comentarios;
- solicitar y confirmar carga de adjuntos;
- obtener URL firmada de descarga;
- eliminar adjunto.

Las operaciones reutilizarán `membersService.requirePermission` y agregarán permisos específicos de tareas. Las comprobaciones contextuales —creador, responsable y autoasignación— se realizarán en el servicio de tareas.

## 7. Integración con Agenda

`AgendaItem.source` incorporará `TASK`.

Una tarea aparecerá en Agenda cuando tenga `dueAt`:

- `TODO` e `IN_PROGRESS` aparecerán como programadas o vencidas según la fecha;
- `DONE` aparecerá como completada;
- el elemento será de solo lectura dentro del calendario;
- al abrirlo, el usuario irá al detalle de la tarea;
- cambiar o eliminar la fecha límite actualizará automáticamente la proyección porque Agenda consultará directamente las tareas.

No se crearán registros duplicados en `business_events`. Los recordatorios automáticos de tareas quedan fuera de la primera versión.

## 8. Experiencia web

### 8.1 Navegación

El menú principal incluirá **Tareas** y enlazará a:

`/dashboard/:businessId/tareas`

### 8.2 Pantalla del tablero

La pantalla tendrá:

- encabezado y acción **Nueva tarea**;
- filtros y búsqueda;
- tres columnas Kanban;
- estados de carga, error y vacío;
- tarjetas accesibles por teclado;
- drag-and-drop accesible para mover una tarea entre estados;
- acción explícita alternativa para cambiar el estado sin arrastrar.

### 8.3 Detalle

Ruta propuesta:

`/dashboard/:businessId/tareas/:taskId`

El detalle mostrará:

- datos y estado de la tarea;
- responsable;
- fecha y prioridad;
- comentarios;
- galería/listado de adjuntos;
- controles permitidos según el rol del usuario.

## 9. Errores y concurrencia

- Una asignación a un integrante inactivo o de otro negocio debe rechazarse.
- Una actualización con versión obsoleta debe devolver conflicto y pedir recargar.
- El drag-and-drop actualizará el tablero de forma optimista; ante rechazo, conflicto o fallo de red, el cliente invalidará y recargará las consultas para recuperar el estado canónico sin sobrescribir movimientos posteriores.
- Una tarea eliminada no debe seguir apareciendo en Agenda.
- Un adjunto no confirmado no debe aparecer en la tarea.
- Un archivo con tipo, tamaño o clave inválidos debe rechazarse.
- Nunca se confiará únicamente en el nombre o `Content-Type` enviado por el navegador.
- Los errores parciales de R2 deben conservar información suficiente para reintentar la limpieza.

## 10. Verificación

La implementación deberá cubrir con pruebas automatizadas:

- permisos por rol;
- creación con y sin responsable;
- autoasignación de operadores;
- rechazo de asignaciones cruzadas entre negocios;
- transiciones de estado y `completedAt`;
- comentarios;
- límites y seguridad de adjuntos;
- proyección de tareas en Agenda;
- concurrencia por versión.

La interfaz web se verificará además con typecheck, lint y pruebas manuales de los flujos completos.

## 11. Fuera de alcance inicial

- aplicación móvil;
- orden manual de tarjetas o columnas;
- múltiples responsables;
- subtareas;
- comentarios anidados;
- menciones y notificaciones;
- recordatorios automáticos;
- etiquetas personalizadas;
- dependencias entre tareas;
- tareas recurrentes;
- automatizaciones agénticas que creen o ejecuten tareas sin aprobación.

Estas capacidades podrán agregarse cuando el uso real demuestre su necesidad.
