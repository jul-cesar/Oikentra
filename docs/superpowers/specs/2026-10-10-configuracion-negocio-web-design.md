# Diseño: configuración del negocio en web

**Fecha:** 2026-10-10
**Estado:** Aprobado

## Objetivo

Convertir la pantalla monolítica de configuración del negocio en una sección clara y escalable, sin aumentar el número de entradas del menú principal.

## Situación actual

La ruta `/dashboard/[businessId]/configuracion` reúne tres responsabilidades:

1. Información general del negocio.
2. Medios de pago.
3. Colaboradores, invitaciones y permisos.

El componente `business-settings.tsx` coordina todas las áreas. Además, `collaborators-settings.tsx` contiene por sí solo la administración completa del equipo. Esta concentración dificulta encontrar opciones y mantener cada flujo de forma independiente.

## Arquitectura de información

La barra lateral conservará una única entrada: **Configuración**.

La sección tendrá navegación interna con estas páginas:

| Sección | Ruta | Acceso |
| --- | --- | --- |
| General | `/dashboard/[businessId]/configuracion` | `OWNER`, `MANAGER` |
| Medios de pago | `/dashboard/[businessId]/configuracion/medios-de-pago` | `OWNER`, `MANAGER` |
| Equipo y permisos | `/dashboard/[businessId]/configuracion/equipo` | `OWNER` |

La ruta actual seguirá mostrando **General** para preservar enlaces existentes.

## Navegación y composición

Un layout compartido de Configuración contendrá:

- Encabezado de la sección.
- Navegación local con estado activo.
- Área donde Next.js renderiza la página seleccionada.

En escritorio, la navegación local será vertical y permanecerá junto al contenido. En pantallas pequeñas será una fila horizontal desplazable. Se usarán enlaces de Next.js para conservar el historial y permitir navegación por teclado.

No se añadirán nuevas entradas a la navegación principal.

## Páginas

### General

Contendrá:

- Logo.
- Nombre del negocio.
- Tipo de negocio.
- Descripción.
- Moneda.
- Zona horaria.
- Acción para guardar cambios.

El formulario conservará su validación y mutaciones actuales. Se mejorará la jerarquía visual agrupando identidad y preferencias regionales dentro de la misma página, sin crear pasos ni formularios adicionales.

### Medios de pago

Contendrá:

- Formulario breve para agregar un medio.
- Lista de medios activos.
- Estado vacío.
- Confirmación antes de desactivar un medio.

La página reutilizará `PaymentMethodsSettings` y sus consultas actuales.

### Equipo y permisos

Contendrá:

- Formulario de invitación.
- Miembros activos.
- Invitaciones.
- Cambio de rol.
- Retiro de miembros.
- Revocación de invitaciones.

La página reutilizará `CollaboratorsSettings`. El enlace y la ruta estarán restringidos a propietarios. Un acceso directo no autorizado redirigirá a Configuración general.

## Estados y errores

Cada página administrará sus propios estados de carga, vacío y error. Las mutaciones conservarán la retroalimentación mediante mensajes emergentes y los errores de validación permanecerán asociados a sus campos.

El layout compartido solo resolverá el negocio, la sesión y los permisos comunes. No cargará datos de medios de pago o colaboradores cuando el usuario esté en otra sección.

## Diseño visual

Se respetarán los componentes y tokens existentes de Oikentra:

- Jerarquía tipográfica clara con un solo `h1` por página.
- Ancho de lectura estable y separación basada en la escala existente.
- Estado activo visible en la navegación local.
- Foco de teclado visible.
- Iconos de la familia ya instalada; no se incorporará otra biblioteca.
- Contraste mínimo de 4.5:1 para texto normal.
- Sin animaciones nuevas salvo transiciones existentes y no esenciales.

## Componentes y archivos previstos

- Layout compartido bajo `app/dashboard/[businessId]/configuracion/`.
- Página general existente, reducida a su responsabilidad.
- Nuevas páginas para `medios-de-pago` y `equipo`.
- Un componente pequeño para la navegación local.
- Reutilización de `PaymentMethodsSettings` y `CollaboratorsSettings`.
- Ajuste de `business-settings.tsx` para contener únicamente la página General.

No se cambiarán contratos de API, esquemas de datos ni servicios backend.

## Verificación

La implementación deberá comprobar:

1. Navegación y estado activo en las tres rutas.
2. Visibilidad de Equipo según el rol.
3. Redirección del acceso directo no autorizado.
4. Funcionamiento de guardar General, administrar medios de pago y administrar equipo.
5. Navegación completa mediante teclado y foco visible.
6. Diseño responsive a 375, 768, 1024 y 1440 píxeles.
7. Typecheck y lint de `apps/web`.

## Fuera de alcance

- Cambios en la aplicación móvil.
- Nuevos permisos o roles.
- Cambios en APIs o base de datos.
- Personalización avanzada de moneda o zona horaria.
- Nuevas áreas de configuración no existentes.
