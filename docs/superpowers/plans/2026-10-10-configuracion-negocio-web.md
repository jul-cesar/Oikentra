# Configuración del negocio en web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dividir la configuración del negocio en páginas independientes para General, Medios de pago y Equipo, manteniendo una sola entrada en la barra lateral.

**Architecture:** Un layout cliente compartido resolverá autenticación, negocio, permisos y `DashboardShell`. Una función pura definirá las páginas visibles y el acceso por rol; la navegación local y las rutas consumirán esa única regla. Los componentes actuales de medios de pago y colaboradores se reutilizarán sin cambiar APIs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI/shadcn existente, TanStack Query, React Hook Form, Zod, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-10-configuracion-negocio-web-design.md`

## Global Constraints

- Conservar `/dashboard/[businessId]/configuracion` como la página General.
- Crear únicamente `/configuracion/medios-de-pago` y `/configuracion/equipo`.
- `OWNER` y `MANAGER` acceden a General y Medios de pago; solo `OWNER` accede a Equipo.
- Un acceso directo no autorizado redirige a `/dashboard/[businessId]/configuracion`.
- No cambiar contratos API, esquemas de datos, servicios backend ni la aplicación móvil.
- Reutilizar `PaymentMethodsSettings`, `CollaboratorsSettings`, componentes y tokens existentes.
- No añadir dependencias ni otra biblioteca de iconos.
- Mantener foco visible, navegación por teclado, texto con contraste mínimo 4.5:1 y un solo `h1` por página.
- No modificar los cambios locales preexistentes en `apps/web/components.json`, `apps/web/components/nav-user.tsx`, `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/components/motion/` o `apps/web/lib/ease.ts`.

## Review Focus

- Un `MANAGER` que escriba directamente `/configuracion/equipo` debe terminar en General sin ver controles de equipo.
- Un `OPERATOR` que escriba cualquier ruta de Configuración debe volver al dashboard del negocio.
- La entrada principal Configuración debe permanecer activa en todas las rutas hijas, no solo en General.
- Una ruta desconocida bajo Configuración no debe marcar otra opción local como activa.
- La navegación horizontal en 375 px debe permitir alcanzar todos los enlaces sin ocultar el foco de teclado.

---

### Task 1: Modelo único de navegación y permisos

**Files:**
- Create: `apps/web/components/dashboard/business-settings-navigation.ts`
- Test: `apps/web/components/dashboard/business-settings-navigation.test.ts`

**Interfaces:**
- Consumes: `Business["role"]` desde `@/lib/onboarding-api`.
- Produces: `getBusinessSettingsItems(businessId: string, role: Business["role"]): BusinessSettingsItem[]`, `canAccessBusinessSettingsPath(pathname: string, businessId: string, role: Business["role"]): boolean`, `isBusinessSettingsPath(pathname: string, businessId: string): boolean`.
- `BusinessSettingsItem` contiene `title`, `description`, `href` y `match: "exact" | "prefix"`; General, Medios de pago y Equipo usan el texto aprobado en la especificación.

- [ ] **Step 1: Escribir las pruebas fallidas del modelo**

Usar `node:test` y `node:assert/strict`. Cubrir estas aserciones:

```ts
assert.deepEqual(
  getBusinessSettingsItems("business-1", "MANAGER").map(({ title, href }) => ({ title, href })),
  [
    { title: "General", href: "/dashboard/business-1/configuracion" },
    { title: "Medios de pago", href: "/dashboard/business-1/configuracion/medios-de-pago" },
  ],
);
assert.equal(canAccessBusinessSettingsPath("/dashboard/business-1/configuracion/equipo", "business-1", "MANAGER"), false);
assert.equal(canAccessBusinessSettingsPath("/dashboard/business-1/configuracion/equipo", "business-1", "OWNER"), true);
assert.equal(canAccessBusinessSettingsPath("/dashboard/business-1/configuracion", "business-1", "OPERATOR"), false);
assert.equal(isBusinessSettingsPath("/dashboard/business-1/configuracion/medios-de-pago", "business-1"), true);
assert.equal(isBusinessSettingsPath("/dashboard/business-10/configuracion", "business-1"), false);
```

Añadir una prueba que confirme que ninguna opción queda activa para `/configuracion/desconocida`.

- [ ] **Step 2: Ejecutar la prueba para confirmar el fallo**

Run: `node --test apps/web/components/dashboard/business-settings-navigation.test.ts`

Expected: FAIL porque el módulo todavía no existe.

- [ ] **Step 3: Implementar el modelo mínimo**

Crear tipos explícitos y las tres funciones indicadas. Construir las rutas desde `businessId`; no introducir configuración externa ni patrones de rutas genéricos. La comprobación del prefijo debe exigir el separador `/` para no confundir `business-1` con `business-10`.

- [ ] **Step 4: Ejecutar la prueba para confirmar que pasa**

Run: `node --test apps/web/components/dashboard/business-settings-navigation.test.ts`

Expected: PASS para navegación, roles, ruta desconocida y límites del identificador.

- [ ] **Step 5: Verificar tipos**

Run: `pnpm --filter @oikentra/web typecheck`

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/dashboard/business-settings-navigation.ts apps/web/components/dashboard/business-settings-navigation.test.ts
git commit -m "feat(web): model business settings navigation"
```

---

### Task 2: Layout compartido y navegación local responsive

**Files:**
- Create: `apps/web/app/dashboard/[businessId]/configuracion/layout.tsx`
- Create: `apps/web/components/dashboard/business-settings-layout.tsx`
- Create: `apps/web/components/dashboard/business-settings-nav.tsx`
- Modify: `apps/web/components/app-sidebar.tsx:32-109`
- Test: `apps/web/components/dashboard/business-settings-navigation.test.ts`

**Interfaces:**
- Consumes: las funciones de Task 1, `AuthGuard`, `useSession`, `useBusiness`, `DashboardShell` y `Business`.
- Produces: `getActiveBusinessSettingsItem(pathname: string, items: BusinessSettingsItem[]): BusinessSettingsItem | undefined`, `BusinessSettingsLayout({ children }: { children: React.ReactNode })` y `BusinessSettingsNav({ businessId, role }: { businessId: string; role: Business["role"] })`.
- El layout de App Router delega directamente en `BusinessSettingsLayout`.

- [ ] **Step 1: Escribir la prueba fallida del estado activo**

Agregar aserciones para:

```ts
const ownerItems = getBusinessSettingsItems("business-1", "OWNER");
assert.equal(
  getActiveBusinessSettingsItem("/dashboard/business-1/configuracion/medios-de-pago", ownerItems)?.title,
  "Medios de pago",
);
assert.equal(
  getActiveBusinessSettingsItem("/dashboard/business-1/configuracion/desconocida", ownerItems),
  undefined,
);
```

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo nuevo**

Run: `node --test apps/web/components/dashboard/business-settings-navigation.test.ts`

Expected: FAIL porque `getActiveBusinessSettingsItem` todavía no existe.

- [ ] **Step 3: Implementar el cálculo de opción activa**

Añadir `getActiveBusinessSettingsItem` al modelo. Una opción `exact` exige igualdad; una opción `prefix` exige igualdad o el prefijo seguido por `/`. No usar coincidencias parciales de texto.

- [ ] **Step 4: Implementar `BusinessSettingsNav`**

Usar `usePathname`, `Link`, `getBusinessSettingsItems` y `getActiveBusinessSettingsItem`. Renderizar enlaces semánticos con estado activo visible y `aria-current="page"`. Usar una columna en escritorio y una fila con `overflow-x-auto` en móvil; ningún control debe depender solo del color para comunicar el estado.

- [ ] **Step 5: Implementar `BusinessSettingsLayout`**

Envolver el contenido con `AuthGuard`. Resolver `businessId`, sesión y negocio una vez; mostrar `OikentraLoader` durante carga y el estado de error existente cuando falten negocio o usuario. Redirigir `OPERATOR` a `/dashboard/${businessId}`. Para cualquier ruta no permitida por el rol, redirigir a `/dashboard/${businessId}/configuracion`. Cuando el acceso sea válido, renderizar `DashboardShell`, navegación local y `children`.

- [ ] **Step 6: Añadir el layout de ruta**

`app/dashboard/[businessId]/configuracion/layout.tsx` debe limitarse a importar el componente compartido y pasar `children`.

- [ ] **Step 7: Mantener activa la entrada principal**

En `AppSidebar`, sustituir la igualdad exacta de Configuración por `isBusinessSettingsPath(pathname, business.id)`. Cambiar el texto visible de `Configurar negocio` a `Configuración`; conservar el icono existente.

- [ ] **Step 8: Ejecutar verificaciones automáticas**

Run:

```bash
node --test apps/web/components/dashboard/business-settings-navigation.test.ts
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Expected: todas las pruebas pasan y typecheck/lint terminan con exit code 0.

- [ ] **Step 9: Verificar navegación accesible manualmente**

Con el servidor local abierto, recorrer los enlaces mediante `Tab` y `Enter` a 375 px y 1024 px. Confirmar foco visible, `aria-current`, desplazamiento horizontal accesible en móvil y navegación vertical en escritorio.

- [ ] **Step 10: Commit**

```bash
git add apps/web/app/dashboard/[businessId]/configuracion/layout.tsx apps/web/components/dashboard/business-settings-layout.tsx apps/web/components/dashboard/business-settings-nav.tsx apps/web/components/app-sidebar.tsx apps/web/components/dashboard/business-settings-navigation.test.ts apps/web/components/dashboard/business-settings-navigation.ts
git commit -m "feat(web): add business settings section layout"
```

---

### Task 3: Separar General, Medios de pago y Equipo

**Files:**
- Modify: `apps/web/components/dashboard/business-settings.tsx:1-399`
- Modify: `apps/web/app/dashboard/[businessId]/configuracion/page.tsx:1-6`
- Create: `apps/web/app/dashboard/[businessId]/configuracion/medios-de-pago/page.tsx`
- Create: `apps/web/app/dashboard/[businessId]/configuracion/equipo/page.tsx`

**Interfaces:**
- Consumes: layout y permisos de Task 2, `PaymentMethodsSettings({ businessId })`, `CollaboratorsSettings({ businessId })`.
- Produces: tres páginas independientes; `BusinessSettings` pasa a representar únicamente el formulario General.

- [ ] **Step 1: Reducir `BusinessSettings` a General**

Eliminar de `business-settings.tsx` la responsabilidad de `AuthGuard`, `DashboardShell`, sesión, redirección general, `PaymentMethodsSettings` y `CollaboratorsSettings`. Conservar sin cambios funcionales la carga del negocio, validación, subida/eliminación del logo y mutación de guardado. El componente debe renderizar un `h1` “Información general” y su formulario; el layout ya proporciona el contenedor común.

- [ ] **Step 2: Mantener General en la ruta actual**

Conservar `configuracion/page.tsx` como adaptador mínimo que renderiza `BusinessSettings`.

- [ ] **Step 3: Crear la página Medios de pago**

Crear una página cliente que obtenga `businessId` con `useParams`, muestre `h1` “Medios de pago”, texto introductorio y `PaymentMethodsSettings`. No duplicar el título dentro de una nueva tarjeta; reutilizar el componente existente sin cambiar sus consultas ni mutaciones.

- [ ] **Step 4: Crear la página Equipo y permisos**

Crear una página cliente que obtenga `businessId` con `useParams`, muestre `h1` “Equipo y permisos”, texto introductorio y `CollaboratorsSettings`. No duplicar lógica de autorización: Task 2 bloquea y redirige antes de mostrar el contenido.

- [ ] **Step 5: Comprobar los tres flujos funcionales**

Como `OWNER`: guardar un cambio General, agregar/desactivar un medio de pago y abrir las acciones de equipo. Como `MANAGER`: confirmar General y Medios de pago, ausencia del enlace Equipo y redirección al escribir su URL. Como `OPERATOR`: confirmar redirección desde las tres URLs al dashboard del negocio.

- [ ] **Step 6: Verificar estados por página**

Confirmar que carga, error, vacío y mensajes de mutación aparecen únicamente en la página correspondiente. Navegar entre páginas y comprobar que no se solicitan miembros ni medios de pago fuera de su ruta.

- [ ] **Step 7: Ejecutar la verificación completa**

Run:

```bash
node --test apps/web/components/dashboard/business-settings-navigation.test.ts
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
pnpm --filter @oikentra/web build
```

Expected: prueba PASS y los tres comandos de aplicación terminan con exit code 0.

- [ ] **Step 8: Revisar responsive y accesibilidad**

Verificar 375, 768, 1024 y 1440 px: sin desbordamiento de formularios, foco no oculto, orden de encabezados `h1` → `h2`, controles alcanzables por teclado, mensajes de error asociados y contraste legible en los temas existentes.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/dashboard/business-settings.tsx apps/web/app/dashboard/[businessId]/configuracion/page.tsx apps/web/app/dashboard/[businessId]/configuracion/medios-de-pago/page.tsx apps/web/app/dashboard/[businessId]/configuracion/equipo/page.tsx
git commit -m "feat(web): split business settings pages"
```

---

### Task 4: Revisión de integración

**Files:**
- Modify only if verification finds a defect: files introduced or modified in Tasks 1–3.

**Interfaces:**
- Consumes: implementación completa de Tasks 1–3.
- Produces: sección verificada sin cambios colaterales.

- [ ] **Step 1: Revisar el diff limitado al alcance**

Run: `git diff --stat HEAD~3..HEAD && git diff --check HEAD~3..HEAD`

Expected: solo aparecen los archivos declarados; `git diff --check` no reporta errores.

- [ ] **Step 2: Ejecutar el conjunto final**

Run:

```bash
node --test apps/web/components/dashboard/business-settings-navigation.test.ts
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
pnpm --filter @oikentra/web build
```

Expected: todos terminan correctamente.

- [ ] **Step 3: Hacer una pasada final en navegador**

Recorrer General → Medios de pago → Equipo → General con botones atrás/adelante del navegador. Confirmar URL, estado activo local y estado activo en la barra lateral en cada transición.

- [ ] **Step 4: Confirmar que los cambios preexistentes siguen intactos**

Run: `git status --short`

Expected: cualquier archivo local previo continúa sin ser incluido en los commits de esta implementación.
