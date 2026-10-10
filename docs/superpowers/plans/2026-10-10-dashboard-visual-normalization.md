# Dashboard Visual Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize every authenticated web-dashboard screen around Caja's shadcn visual language without changing user flows or business behavior.

**Architecture:** Keep the existing shadcn primitives as the base. Add one small dashboard page wrapper for repeated width and vertical-rhythm rules, centralize responsive gutters in `DashboardShell`, and migrate one feature module at a time. A source-level contract test prevents forbidden dashboard-only radius and shadow variants from returning; browser walkthroughs provide the visual proof that source checks cannot.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, Node test runner, Python Playwright for one-time visual audit

**Spec:** `docs/superpowers/specs/2026-10-10-dashboard-visual-normalization-design.md`

## Global Constraints

- Caja (`/dashboard/[businessId]/ventas`) is the visual reference.
- Presentation only: do not change flows, permissions, data loading, mutations, or business behavior.
- Use existing semantic theme tokens and shadcn primitives; add no UI dependency or parallel token system.
- Standard cards: `rounded-xl`, subtle border/ring, no added shadow.
- Featured surfaces: `rounded-2xl`; reserve solid primary treatment for the main summary.
- Inputs: existing `h-8 rounded-lg` style.
- Pills: only segmented filters, search/filter controls, and status badges.
- Remove unexplained `rounded-3xl` and decorative `shadow-md`, `shadow-xl`, or `shadow-2xl` from dashboard code.
- Preserve wide layouts for Agenda and dense tables.
- Accessibility: preserve labels, accessible names, keyboard focus, reduced motion, and required contrast in both themes.
- Verify desktop/mobile and light/dark for every included route.
- Do not add permanent screenshot-regression infrastructure.

## Review Focus

- **375px viewport:** no horizontal overflow; Task 9 checks every route at mobile width.
- **Dark theme:** borders, focus rings, disabled states, and overlays remain distinguishable; Task 9 checks every route in dark mode.
- **Wide content:** Agenda and dense tables retain usable width; Tasks 3 and 9 verify their wide variants.
- **Long content:** business names, customer names, task titles, and currency values wrap or truncate without moving actions; Tasks 2, 4, 5, and 9 cover representative long values.
- **Non-happy states:** loading, empty, error, invalid, and disabled states keep consistent hierarchy without changing recovery behavior; module tests and Task 9 exercise reachable states.

---

### Task 1: Establish the Dashboard Visual Contract

**Files:**
- Create: `apps/web/components/dashboard/dashboard-page.tsx`
- Create: `apps/web/tests/dashboard-visual-style.test.mjs`
- Modify: `apps/web/components/dashboard/dashboard-shell.tsx`
- Verify only: `apps/web/components/ui/card.tsx`
- Verify only: `apps/web/components/ui/input.tsx`
- Verify only: `apps/web/components/ui/dialog.tsx`

**Interfaces:**
- Produces: `DashboardPage({ width?: "default" | "wide", className?, ...divProps })`
- `width="default"` applies `max-w-5xl`; `width="wide"` applies `max-w-none`.
- Both widths apply `mx-auto w-full space-y-5 sm:space-y-6`.
- Produces test helper `assertDashboardVisualPolicy(paths)` inside the MJS test file; it rejects `rounded-3xl`, `shadow-md`, `shadow-xl`, and `shadow-2xl` in supplied dashboard files.

- [ ] **Step 1: Write failing contract tests**

Add tests named `dashboard shell owns canonical gutters`, `dashboard page exposes default and wide widths`, and `shared primitives match the approved baseline`. Assert the exact wrapper classes above, `DashboardShell` main gutters `px-3 py-5 sm:px-4 sm:py-8 lg:px-8`, Card `rounded-xl`, Input `h-8 ... rounded-lg`, and Dialog `rounded-xl ... shadow-lg`.

- [ ] **Step 2: Verify the contract tests fail for the missing wrapper and old shell spacing**

Run: `node --test --test-name-pattern="dashboard shell|dashboard page|shared primitives" apps/web/tests/dashboard-visual-style.test.mjs`  
Expected: FAIL because `dashboard-page.tsx` is missing and shell spacing differs.

- [ ] **Step 3: Implement the minimum shared layout**

Create `DashboardPage` with the interface above and `cn`. Change only the `<main>` spacing in `DashboardShell`; do not change navigation, breadcrumbs, sign-out, prefetching, or chat behavior.

- [ ] **Step 4: Verify Task 1**

Run the focused Node test, then:

```bash
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/dashboard-page.tsx components/dashboard/dashboard-shell.tsx tests/dashboard-visual-style.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/dashboard-page.tsx apps/web/components/dashboard/dashboard-shell.tsx apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): establish dashboard visual contract"
```

### Task 2: Normalize Dashboard Home and Summary Screens

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/components/dashboard/dashboard/dashboard-page.tsx`
- Modify: `apps/web/components/dashboard/resumen-general/resumen-general-page.tsx`
- Modify: `apps/web/components/dashboard/business-dashboard.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`

**Interfaces:**
- Consumes: `DashboardPage` from Task 1.
- Produces: canonical page headers and summary surfaces used as examples by later tasks.

- [ ] **Step 1: Add failing home/summary policy tests**

Add a `home and summary screens follow Caja hierarchy` test. Run `assertDashboardVisualPolicy` on all four files; assert canonical title/description classes, standard card treatment, and one featured `rounded-2xl` summary surface where the screen has a primary summary.

- [ ] **Step 2: Verify the focused test fails**

Run: `node --test --test-name-pattern="home and summary" apps/web/tests/dashboard-visual-style.test.mjs`  
Expected: FAIL on existing radius, shadow, wrapper, or header differences.

- [ ] **Step 3: Normalize the four screens**

Use `DashboardPage`, retain current content and query behavior, and replace only presentation classes. Keep business selection behavior in `/dashboard` unchanged. Ensure long business names do not displace actions.

- [ ] **Step 4: Verify Task 2**

```bash
node --test --test-name-pattern="home and summary" apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- app/dashboard/page.tsx components/dashboard/dashboard/dashboard-page.tsx components/dashboard/resumen-general/resumen-general-page.tsx components/dashboard/business-dashboard.tsx
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/page.tsx apps/web/components/dashboard/dashboard/dashboard-page.tsx apps/web/components/dashboard/resumen-general/resumen-general-page.tsx apps/web/components/dashboard/business-dashboard.tsx apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): normalize dashboard summaries"
```

### Task 3: Normalize Agenda Without Constraining the Calendar

**Files:**
- Modify: `apps/web/components/dashboard/agenda/agenda-page.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`
- Test: `apps/web/tests/agenda-page.test.mjs`

**Interfaces:**
- Consumes: `DashboardPage width="wide"`.
- Preserves: `EventCalendar`, month/week/day modes, API calls, reminders, and dialog behavior.

- [ ] **Step 1: Add failing Agenda visual tests**

Assert `width="wide"`, canonical header classes, approved dialog/control primitives, and the module visual policy. Keep existing behavioral assertions. Add a source assertion that no fixed `max-w-5xl` wraps the calendar.

- [ ] **Step 2: Verify Agenda tests fail for visual differences**

Run: `node --test --test-name-pattern="agenda|Agenda" apps/web/tests/agenda-page.test.mjs apps/web/tests/dashboard-visual-style.test.mjs`  
Expected: FAIL only on new visual assertions.

- [ ] **Step 3: Normalize Agenda presentation**

Change wrapper, header, dialog spacing, filters, and surfaces only. Do not change calendar configuration or form behavior.

- [ ] **Step 4: Verify Task 3**

```bash
node --test --test-name-pattern="agenda|Agenda" apps/web/tests/agenda-page.test.mjs apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/agenda/agenda-page.tsx tests/agenda-page.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/agenda/agenda-page.tsx apps/web/tests/agenda-page.test.mjs apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): normalize agenda presentation"
```

### Task 4: Normalize Task List, Board, Create, and Detail

**Files:**
- Modify: `apps/web/components/dashboard/tasks/tasks-page.tsx`
- Modify: `apps/web/components/dashboard/tasks/create-task-page.tsx`
- Modify: `apps/web/components/dashboard/tasks/task-detail.tsx`
- Modify: `apps/web/components/dashboard/tasks/task-board.tsx`
- Modify: `apps/web/components/dashboard/tasks/task-card.tsx`
- Modify as needed: `apps/web/components/dashboard/tasks/edit-task-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/tasks/task-attachments.tsx`
- Modify as needed: `apps/web/components/dashboard/tasks/attachment-dropzone.tsx`
- Modify as needed: `apps/web/components/dashboard/tasks/task-comments.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`
- Test: `apps/web/tests/tasks-board.test.mjs`

**Interfaces:**
- Consumes: `DashboardPage` default width; use `wide` only where the existing board needs it.
- Preserves: task status transitions, drag/drop, attachments, comments, create/edit forms, and detail navigation.

- [ ] **Step 1: Add failing Task visual tests**

Add one test covering all listed files with `assertDashboardVisualPolicy`. Assert canonical headers, standard cards, pills only for task status/filter controls, and long task titles retaining action alignment.

- [ ] **Step 2: Verify Task tests fail**

Run: `node --test --test-name-pattern="task|Task" apps/web/tests/tasks-board.test.mjs apps/web/tests/dashboard-visual-style.test.mjs`  
Expected: FAIL on new visual assertions while existing behavior tests remain green.

- [ ] **Step 3: Normalize Task presentation**

Change classes and wrappers only. Preserve event handlers, DnD identifiers, form schemas, and API calls.

- [ ] **Step 4: Verify Task 4**

```bash
node --test --test-name-pattern="task|Task" apps/web/tests/tasks-board.test.mjs apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/tasks tests/tasks-board.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/tasks apps/web/tests/tasks-board.test.mjs apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): normalize task screens"
```

### Task 5: Normalize Customers and Portfolio

**Files:**
- Modify: `apps/web/components/dashboard/customers/customers-page.tsx`
- Modify: `apps/web/components/dashboard/customers/create-customer-dialog.tsx`
- Modify: `apps/web/components/dashboard/cartera/cartera-page.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`
- Do not modify: `apps/web/components/dashboard/cartera/cartera-model.ts`

**Interfaces:**
- Consumes: `DashboardPage` and canonical headers/surfaces.
- Preserves: customer creation, filters, portfolio grouping, totals, and detail links.

- [ ] **Step 1: Add failing Customers/Portfolio policy tests**

Assert canonical wrappers and headers, standard cards, approved pill usage, no forbidden radius/shadows, and safe truncation/wrapping for long customer names and currency values.

- [ ] **Step 2: Verify the focused test fails**

Run: `node --test --test-name-pattern="customers and portfolio" apps/web/tests/dashboard-visual-style.test.mjs`  
Expected: FAIL on current local overrides.

- [ ] **Step 3: Normalize Customers and Portfolio presentation**

Change classes only; preserve all queries, mutations, calculations, and routes.

- [ ] **Step 4: Verify Task 5**

```bash
node --test --test-name-pattern="customers and portfolio" apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/customers components/dashboard/cartera
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/customers apps/web/components/dashboard/cartera apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): normalize customers and portfolio"
```

### Task 6: Normalize Caja and Its Secondary Screens

**Files:**
- Modify: `apps/web/components/dashboard/ventas/ventas-page.tsx`
- Modify: `apps/web/components/dashboard/ventas/categories-page.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/movement-row.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/create-sale-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/create-expense-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/create-category-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/delete-category-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/cancel-movement-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/ventas/export-report-dialog.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`

**Interfaces:**
- Consumes: `DashboardPage` and Task 1 contract.
- Produces: final canonical Caja implementation against which browser checks compare other routes.
- Preserves: movement filters, search, sales/expense creation, cancellation, categories, statistics navigation, and export.

- [ ] **Step 1: Add failing Caja module tests**

Assert the canonical outer wrapper, one primary featured summary, standard secondary surfaces, approved filter pills, `shadow-sm` selected controls, and policy compliance across every Caja file.

- [ ] **Step 2: Verify the focused test fails on remaining Caja exceptions**

Run: `node --test --test-name-pattern="Caja" apps/web/tests/dashboard-visual-style.test.mjs`.

- [ ] **Step 3: Normalize Caja and secondary screens**

Remove duplicate outer padding after adopting `DashboardPage`; keep the existing visual hierarchy and all behavior.

- [ ] **Step 4: Verify Task 6**

```bash
node --test --test-name-pattern="Caja" apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/ventas
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/ventas apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): codify Caja visual baseline"
```

### Task 7: Normalize Credit and Loan Detail Flows

**Files:**
- Modify: `apps/web/components/dashboard/fiados/customer-detail.tsx`
- Modify as needed: `apps/web/components/dashboard/fiados/create-credit-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/fiados/create-payment-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/fiados/cancel-dialog.tsx`
- Modify: `apps/web/components/dashboard/prestamos/loan-detail.tsx`
- Modify as needed: `apps/web/components/dashboard/prestamos/create-loan-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/prestamos/create-payment-dialog.tsx`
- Modify as needed: `apps/web/components/dashboard/prestamos/cancel-dialog.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`
- Test: `apps/web/tests/detail-pages.test.mjs`

**Interfaces:**
- Consumes: `DashboardPage` and canonical surfaces/forms.
- Preserves: redirect-only list routes, dedicated detail routes, credit/loan creation, payments, and cancellation.

- [ ] **Step 1: Add failing finance-detail visual tests**

Assert both details use canonical wrappers/headers, dialogs keep `rounded-xl shadow-lg`, monetary values remain tabular, long names remain stable, and all listed files pass the policy helper.

- [ ] **Step 2: Verify finance-detail tests fail only on visual assertions**

Run: `node --test --test-name-pattern="detail|credit|loan" apps/web/tests/detail-pages.test.mjs apps/web/tests/dashboard-visual-style.test.mjs`.

- [ ] **Step 3: Normalize detail and dialog presentation**

Do not change redirects, route construction, financial calculations, or mutation behavior.

- [ ] **Step 4: Verify Task 7**

```bash
node --test --test-name-pattern="detail|credit|loan" apps/web/tests/detail-pages.test.mjs apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/fiados components/dashboard/prestamos tests/detail-pages.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/fiados apps/web/components/dashboard/prestamos apps/web/tests/detail-pages.test.mjs apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): normalize credit and loan details"
```

### Task 8: Normalize Business and Profile Settings

**Files:**
- Modify: `apps/web/components/dashboard/business-settings.tsx`
- Modify: `apps/web/components/dashboard/collaborators-settings.tsx`
- Modify: `apps/web/components/dashboard/payment-methods-settings.tsx`
- Modify: `apps/web/components/dashboard/profile-settings.tsx`
- Test: `apps/web/tests/dashboard-visual-style.test.mjs`

**Interfaces:**
- Consumes: `DashboardPage` and canonical form controls.
- Preserves: permissions, profile updates, business updates, collaborator actions, and payment-method mutations.

- [ ] **Step 1: Add failing settings visual tests**

Assert canonical wrappers and headers, consistent field spacing, existing shadcn control heights, standard cards, approved dialog treatment, and policy compliance.

- [ ] **Step 2: Verify the focused test fails**

Run: `node --test --test-name-pattern="settings" apps/web/tests/dashboard-visual-style.test.mjs`.

- [ ] **Step 3: Normalize settings presentation**

Change presentation only; preserve authorization checks, schemas, handlers, and API calls.

- [ ] **Step 4: Verify Task 8**

```bash
node --test --test-name-pattern="settings" apps/web/tests/dashboard-visual-style.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint -- components/dashboard/business-settings.tsx components/dashboard/collaborators-settings.tsx components/dashboard/payment-methods-settings.tsx components/dashboard/profile-settings.tsx
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/business-settings.tsx apps/web/components/dashboard/collaborators-settings.tsx apps/web/components/dashboard/payment-methods-settings.tsx apps/web/components/dashboard/profile-settings.tsx apps/web/tests/dashboard-visual-style.test.mjs
git commit -m "refactor(ui): normalize dashboard settings"
```

### Task 9: Complete the Route-by-Route Visual Audit

**Files:**
- Create: `docs/superpowers/audits/2026-10-10-dashboard-visual-audit.md`
- Modify only if a verified defect is found: files owned by Tasks 1-8
- Do not commit: temporary Playwright script and screenshots

**Interfaces:**
- Consumes: all normalized dashboard modules.
- Produces: an audit matrix covering all 19 dashboard routes, with redirect-only routes marked and their destinations verified.

- [ ] **Step 1: Create the audit matrix before browser verification**

List every route under `apps/web/app/dashboard`. Columns: desktop light, desktop dark, mobile light, mobile dark, keyboard/focus, loading/empty/error, result, and notes. Mark `/creditos`, `/fiados`, `/prestamos`, and `/resumen-general` as redirect checks rather than visual destinations.

- [ ] **Step 2: Run the full source verification**

```bash
node --test apps/web/tests/*.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
```

Expected: all commands exit 0.

- [ ] **Step 3: Run the authenticated Playwright walkthrough**

Use the `webapp-testing` skill and its `with_server.py` helper. Use an existing local test session or a user-provided non-secret authentication workflow. For every visual destination, capture 1440px and 375px screenshots in light and dark mode, exercise safe primary controls, and record results in the audit matrix. Stop and report a blocker instead of claiming completion if authenticated access is unavailable.

- [ ] **Step 4: Fix verified visual defects one module at a time**

For each defect: add or tighten the owning source-level assertion when practical, watch it fail, apply the smallest presentation-only fix, rerun that module's checks, and update the audit row.

- [ ] **Step 5: Run final verification**

```bash
node --test apps/web/tests/*.test.mjs
pnpm --filter @oikentra/web typecheck
pnpm --filter @oikentra/web lint
pnpm --filter @oikentra/web build
```

Expected: all commands exit 0 and every audit row is PASS or an explicitly approved exception.

- [ ] **Step 6: Commit the completed audit and any final fixes**

```bash
git add docs/superpowers/audits/2026-10-10-dashboard-visual-audit.md
# If Step 4 changed code, also add only the exact file paths recorded in the audit rows.
git commit -m "test(ui): verify normalized dashboard screens"
```

Do not stage `apps/web` wholesale.
