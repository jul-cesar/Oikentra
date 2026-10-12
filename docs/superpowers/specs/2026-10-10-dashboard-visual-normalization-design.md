# Dashboard Visual Normalization Design

**Date:** 2026-10-10  
**Status:** Approved in conversation; pending written-spec review

## Objective

Normalize the authenticated web dashboard so every screen uses one coherent visual language. The Caja screen (`/dashboard/[businessId]/ventas`) is the visual reference. The work changes presentation only; existing flows, content, permissions, data loading, and business behavior remain unchanged.

## Scope

### Included

- Dashboard shell and navigation chrome
- Dashboard and general summary
- Agenda
- Tasks: list, create, and detail
- Customers
- Caja, categories, and statistics
- Portfolio
- Credits, customer credit, and loans
- Business settings, collaborators, and profile
- Loading, error, empty, and disabled states within these routes
- Desktop and mobile layouts
- Light and dark themes

### Excluded

- Landing pages
- Login, registration, verification, and password recovery
- Mobile application
- Functional redesigns or workflow changes
- New component libraries
- Permanent visual-regression infrastructure
- Brand, typography-family, or color-palette replacement

## Visual Source of Truth

Use the existing shadcn components and semantic theme tokens. Do not create a parallel component system. Caja defines the page-level hierarchy and visual rhythm.

### Layout

- Use responsive dashboard gutters equivalent to `px-3 py-5 sm:px-4 sm:py-8`.
- Use `space-y-5 sm:space-y-6` between major page sections.
- Preserve screen-specific width requirements. Wide Agenda and table views must not be constrained to Caja's content width.
- Preserve existing responsive behavior unless it conflicts with the shared spacing rules.

### Page Headers

- Primary title: `text-3xl font-semibold tracking-tight`.
- Supporting text: `text-sm text-muted-foreground`.
- Group page actions with `gap-2` and preserve mobile wrapping.
- Keep one clear primary action per page where the current workflow already defines one.

### Surfaces

- Standard cards use the existing `Card` default: `rounded-xl`, semantic background, and subtle ring or border without an added shadow.
- Featured summary surfaces may use `rounded-2xl`.
- The solid primary-colored summary treatment is reserved for the main summary block, matching Caja.
- Remove dashboard-local `rounded-3xl` and decorative shadow overrides.
- Use `shadow-sm` only for selected or slightly elevated interactive controls.
- Use `shadow-lg` only for overlays such as dialogs and popovers.

### Controls

- Standard inputs use the existing shadcn `Input` style: `h-8 rounded-lg`.
- Standard selects, textareas, and form controls must follow the same height, border, focus-ring, disabled, and invalid-state language.
- Use `rounded-full` only for segmented filters, search/filter controls, and status badges.
- Preserve semantic focus rings and keyboard behavior.

### Lists and Tables

- Use borders and muted hover backgrounds for row separation instead of card-like shadows on every row.
- Keep monetary and numeric values tabular where Caja already establishes that convention.
- Use consistent empty-state spacing, icon scale, muted copy, and action placement.

## Architecture

### Existing Components First

The existing components in `apps/web/components/ui` remain the primary source of truth. Change a shared primitive only when the change is correct for all of its consumers, including routes outside the dashboard. Otherwise, normalize usage within dashboard components.

Do not add a new wrapper, variant, or token merely to replace one local class. Extract a shared dashboard pattern only after the same structure appears in at least three modules and the extraction reduces duplication without hiding layout intent.

### Migration Strategy

Migrate one module at a time. Do not apply repository-wide class replacement.

1. Dashboard shell, navigation chrome, shared headings, and common states
2. Dashboard, General Summary, Agenda, Tasks, Customers, Caja, and Portfolio
3. Task create/detail, Caja categories, and Caja statistics
4. Credits, customer credit, and loans
5. Business settings, collaborators, and profile

Caja remains the comparison control. It may receive small cleanup changes only when needed to align its own exceptions with this specification.

## State and Error Presentation

- Loading states retain the existing loader behavior and use consistent vertical placement.
- Error states use muted explanatory text, destructive styling only for the error signal, and a clear recovery action when one already exists.
- Empty states use one consistent hierarchy: icon, concise title or explanation, then optional action.
- Disabled and invalid controls must remain distinguishable in both themes.
- No data-fetching or error-handling logic changes are part of this work.

## Accessibility

- Maintain visible keyboard focus on every interactive element.
- Maintain text contrast of at least 4.5:1 and non-text control contrast of at least 3:1 in both themes.
- Do not use color as the only state indicator.
- Keep labels and accessible names for form controls and icon-only buttons.
- Keep decorative icons out of the accessibility tree where visible text already supplies the meaning.
- Preserve reduced-motion behavior.
- Verify that sticky or overlay UI does not hide focused controls.

## Validation

For each dashboard route:

1. Open the route in a real browser session.
2. Compare its hierarchy and surfaces with Caja.
3. Check desktop and mobile widths.
4. Check light and dark themes.
5. Exercise primary controls, forms, filters, dialogs, loading states, empty states, and error states that can be reached safely.
6. Confirm keyboard focus and basic accessibility semantics.
7. Run ESLint, TypeScript, and the existing relevant tests.

Capture representative screenshots during the Playwright walkthrough. Do not add permanent screenshot-testing infrastructure in this phase.

## Acceptance Criteria

- Every included dashboard route has been reviewed and recorded in the implementation checklist.
- Standard cards, inputs, selects, dialogs, lists, tables, and page headers follow this specification.
- Dashboard components contain no unexplained `rounded-3xl` or decorative shadow overrides.
- Pill shapes are limited to filters, search controls, and statuses.
- Loading, error, and empty states are visually consistent.
- Existing user flows and business behavior remain unchanged.
- Desktop/mobile and light/dark checks pass for every included route.
- ESLint, TypeScript, and relevant tests pass.

## Risks and Controls

- **Shared primitive blast radius:** prefer dashboard-local usage changes unless a primitive change is valid globally.
- **Large visual diff:** migrate and verify one module at a time.
- **Wide-screen regressions:** preserve width needs for Agenda and dense tables.
- **Dark-theme regressions:** review both themes instead of inferring one from the other.
- **Authenticated-route access:** use an existing local test session or a user-provided non-secret authentication workflow for the Playwright walkthrough.
