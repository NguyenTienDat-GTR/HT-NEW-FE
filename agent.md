# HT Management FE Agent Log

## Preflight rule

- Before each implementation or test task, reread the full DOCX guide paragraphs and tables, `D:\quan-li-ht-new\BE\project.md`, and this file.
- For UI tasks, reread `D:\quan-li-ht-new\FE\DESIGN.md`.
- When creating or changing UI, follow the local UIPro skill from `D:\quan-li-ht-new\FE\.codex\skills\ui-ux-pro-max`: start with its design-system search, synthesize the result with `DESIGN.md`, and keep the output in a professional SaaS/admin style.
- FE changes, architecture, routes, components, auth client, permission UI, data flow, design tokens, animation, responsive behavior, FE tests, done items, and FE remaining work are recorded here.
- BE changes are recorded only in `D:\quan-li-ht-new\BE\project.md`.
- BẮT BUỘC chia nhỏ code theo từng module, feature, component để tái sử dụng; tránh để một file code thủ công quá dài hoặc gom nhiều trách nhiệm không cùng phạm vi.

## FE architecture

- Next.js App Router with TypeScript strict and Tailwind CSS v4 scaffolded in `D:\quan-li-ht-new\FE`.
- Runtime dependencies installed: Radix/shadcn-style primitives, Phosphor Icons, TanStack Query/Table, React Hook Form, Zod, Zustand, openapi-fetch, StompJS, Recharts, Motion, date-fns/date-fns-tz, Sonner.
- Test/codegen dependencies installed: Vitest, Testing Library, MSW, Playwright, axe, openapi-typescript.
- `next.config.ts` enables `typedRoutes`, `output: "standalone"`, and rewrites `/backend/api/:path*` to `${BACKEND_ORIGIN}/api/:path*`.
- `.env.example` documents `BACKEND_ORIGIN`, `NEXT_PUBLIC_WS_URL`, `E2E_USERNAME`, and `E2E_PASSWORD` with no secrets.

## Routes and data flow

- `/login` and `/change-password` render dedicated auth forms with React Hook Form and Zod.
- `/dashboard`, `/analytics`, `/notifications`, organization, training, certificate, and system routes render through the App Router workspace catch-all and route registry.
- Current module refactor/UI branch is `feature/fe-module-refactor-ui`, created from up-to-date `main` on 2026-07-21.
- Sidebar menu is grouped by module name: dashboard, organization, leader, executive-board, training, training-workflow, certificate, and system.
- Ban điều hành routes now use `/executive-board/positions` and `/executive-board/assignments`; workflow aliases exist for `/training/registrations`, `/training/approvals`, `/training/scores`, `/certificates/approvals`, and `/leaders/profiles`.
- Auth state uses Zustand memory only. Refresh and protected calls use `credentials: "include"`, Bearer access token, single-flight refresh, and retry once.
- Tables sync `page`, `size`, `search`, `sortBy`, and `sortDirection` to URL with 300ms debounce. BaseSearchRequest serializes `filters` as `JSON.stringify`.
- Notifications hydrate from REST and invalidate cache from STOMP `/user/queue/notifications` after connect or message.

## Design system and animation

- Light-only design uses Be Vietnam Pro via `next/font`, HR navy/teal OKLCH palette in `src/styles/tokens.css` (`primary: oklch(0.38 0.085 250)`, `accent: oklch(0.72 0.12 185)`, `success: oklch(0.68 0.14 150)`, `warning: oklch(0.78 0.16 75)`, `danger: oklch(0.62 0.2 25)`, `background: oklch(0.985 0.005 250)`), 44px targets, 264px/76px sidebar states, 1480px content max, compact data rows, 10px buttons, 8px inputs, and 12px panels/charts.
- 2026-07-14 management UI refresh keeps the Clerk-style light surface but widens the workspace to 1400px, uses grouped navigation, module chips, richer table badges, workflow hints, empty/error/loading states, and dashboard work-queue shortcuts.
- Button variants implemented: `primary`, `secondary`, `outline`, `ghost`, `destructive`, and `icon`; loading keeps width stable and disables double submit.
- KPI `AnimatedMetric` uses Motion `useMotionValue`, `useSpring`, and `useReducedMotion`; visual number is `aria-hidden` while final value is exposed by accessible label.
- Chart primitives include `ChartFrame`, `ChartHeader`, `ChartLegend`, `ChartTooltip`, `ChartSkeleton`, `ChartEmpty`, `ChartError`, and `ChartDataTable`.
- Recharts animations are viewport-gated, reduced-motion aware, and use the shared brand/success/warning OKLCH chart palette.
- Muted implementation token is `#70727f` to pass axe/WCAG AA at 14px on white.

## Completed FE files

- `FE/agent.md`: created as the required execution log skeleton.
- `FE/DESIGN.md`: moved from root `DESIGN.md`; SHA-256 before and after is `59CBC6D86E6943AA470D40A24A950925D5E0190AC07AD4E54D2F8CB0749CC24E`; root `DESIGN.md` is no longer present.
- `FE/package.json` and `FE/package-lock.json`: Next.js scaffold, scripts, dependency stack, and lockfile.
- `FE/.gitignore`: ignores build artifacts, coverage, Playwright output, `.env`, `.env.*`, `.idea/`, and `*.iml`; keeps `.env.example`.
- `FE/.env.example`: non-sensitive environment variable sample.
- `FE/next.config.ts`: typed routes, standalone output, and backend rewrite.
- `FE/vitest.config.ts`, `FE/src/test/setup.ts`, `FE/playwright.config.ts`: initial unit and E2E test configuration.
- `FE/scripts/capture-openapi.mjs`: local OpenAPI capture helper for `/v3/api-docs`.
- `FE/openapi/ht-management.json`: captured OpenAPI document.
- `FE/src/lib/api/schema.d.ts`: generated typed API schema.
- `FE/src/lib/api/client.ts`, `FE/src/lib/api/search.ts`, `FE/src/lib/env.ts`: API client, refresh flow, BaseSearchRequest serializer, and env validation.
- `FE/src/lib/auth/*`: memory auth store and permission matcher.
- `FE/src/components/ui/*`: button, icon tooltip button, input, and panel primitives.
- `FE/src/features/auth/*`: login and change-password screens.
- `FE/src/features/workspace/*`: app shell, auth gate, route registry, realtime notification subscription, and workspace renderer.
- `FE/src/features/analytics/*`: KPI, chart primitives, dashboard, analytics adapters, and analytics screens.
- `FE/src/features/resources/resource-list-page.tsx` plus `resource-toolbar.tsx` and `resource-table.tsx`: generic permission-first resource list/table shell for V1 modules.
- `FE/src/**/*.test.*` and `FE/e2e/login.spec.ts`: unit/integration and E2E coverage.
- `FE/src/components/ui/button.tsx`: fixed Radix Slot `asChild` behavior so the Slot receives exactly one child element and no loading wrapper overlay.
- `FE/src/components/ui/button.test.tsx`: added regression coverage for `Button asChild` with `next/link` and kept loading double-submit coverage UTF-8 safe.
- `FE/src/lib/api/client.ts`: kept envelope errors as typed thrown errors for callers, added shared error-message extraction, and restored UTF-8 Vietnamese fallback messages.
- `FE/src/features/auth/login-view.tsx`: catches login envelope errors, shows the server message in toast and form state, and prevents Next dev runtime overlay for invalid credentials.
- `FE/src/features/auth/change-password-view.tsx`: catches submit errors after mutation toast and writes the message into form state instead of leaking the rejection.
- `FE/src/features/auth/login-view.test.tsx` and `FE/src/lib/api/client.test.ts`: cover server-message propagation and login-form toast handling.
- `FE/src/features/workspace/app-shell.tsx`: logout now calls `/auth/logout` with the in-memory Bearer token and refresh cookie through `apiFetch`, treats the server call as best-effort, clears TanStack Query cache, clears Zustand auth memory, disables duplicate logout clicks while pending, and routes back to `/login`.
- `FE/src/features/workspace/routes.ts`: rebuilt route metadata around module names, grouped sidebar sections, corrected executive-board paths, and added workflow/detail aliases for leader profiles, registration, approval, scoring, and certificate approval screens.
- `FE/src/features/workspace/app-shell.tsx`: refreshed grouped module sidebar, topbar search placeholder, user summary, notification entry, mobile drawer, and 1400px workspace width.
- `FE/src/features/workspace/workspace-page.tsx`: cleaned UTF-8 not-found copy after route registry refresh.
- `FE/src/features/resources/resource-list-page.tsx`: redesigned generic resource screens with module chip headers, permission-aware primary actions, filter chips, status selector, richer table cells, avatars, badges, row actions, loading skeletons, empty state, and contextual errors.
- `FE/src/features/workspace/route-config.ts` and `FE/src/features/workspace/route-groups/*`: split route metadata by dashboard, organization, leader, executive-board, training, training-workflow, certificate, and system modules; `routes.ts` now only aggregates groups and exports lookup helpers.
- `FE/src/features/resources/resource-format.tsx`, `resource-list-page.tsx`, `resource-toolbar.tsx`, `resource-table.tsx`, `resource-pagination.tsx`, and `use-resource-query-state.ts`: split generic resource screen formatting, filters/header, table rows, pagination, and URL query-state logic into reusable components/hooks.
- `FE/src/features/resources/resource-pagination.tsx` and `use-resource-query-state.ts`: pagination footer now lets users choose page size and jump to a specific page, keeps first/previous/next/last navigation, and validates URL-derived `page`/`size` defaults before serializing `BaseSearchRequest`.
- `FE/src/features/resources/resource-pagination.tsx`: page selection now uses clickable page-number buttons with compact ellipsis ranges instead of a numeric page input.
- `FE/src/features/resources/use-resource-query-state.ts`: search debounce now updates URL only when the search term differs from the URL search value, so pagination changes no longer get reset back to page 0.
- `FE/src/features/resources/use-resource-query-state.ts`: resource list URL `page` is now one-based for users while `BaseSearchRequest.page` remains zero-based internally for backend calls.
- `FE/src/features/analytics/dashboard-view.tsx`: redesigned dashboard with KPI cards, trend chart, work-queue shortcuts, scope/filter/data insight cards, and clean Vietnamese copy.
- `FE/src/features/analytics/analytics-view.tsx` and `FE/src/features/analytics/types.ts`: refreshed analytics tabs and restored UTF-8 metric labels.
- `FE/src/lib/api/client.ts`: restored UTF-8 Vietnamese fallback messages while preserving refresh/retry and typed envelope behavior.
- `FE/tests/unit/**/*`: unit tests moved out of `FE/src` into `FE/tests/unit`; `FE/src` no longer contains `*.test.*` or `src/test`.
- `FE/vitest.config.ts`: Vitest now includes `tests/unit/**/*.test.ts(x)` and uses `tests/unit/test/setup.ts`.
- `FE/src/components/brand/brand-mark.tsx`: added the shared HT brand mark used by login and workspace shell.
- `FE/src/features/resources/resource-list-page.tsx`: replaced the old one-file generic resource screen with a reusable data/list primitive that module screens compose.
- `FE/src/features/leader/leader-resource-view.tsx`, `FE/src/features/organization/organization-resource-view.tsx`, `FE/src/features/executive-board/executive-board-resource-view.tsx`, `FE/src/features/training/training-resource-view.tsx`, `FE/src/features/training-workflow/training-workflow-resource-view.tsx`, `FE/src/features/certificate/certificate-resource-view.tsx`, and `FE/src/features/system/system-resource-view.tsx`: added module-owned resource screens with their own summary cards, workflow hints, side panels, and tone.
- `FE/src/features/workspace/module-resource-renderer.tsx` and `FE/src/features/workspace/workspace-page.tsx`: route resource pages through module-owned views instead of `ResourceView`; `FE/src/features/resources/resource-view.tsx` was removed.
- `FE/src/features/workspace/app-shell.tsx`, `FE/src/features/auth/login-view.tsx`, `FE/src/features/auth/change-password-view.tsx`, `FE/src/features/resources/resource-toolbar.tsx`, `FE/src/features/resources/resource-table.tsx`, `FE/src/features/resources/resource-format.tsx`, `FE/src/features/analytics/dashboard-view.tsx`, and `FE/src/features/analytics/animated-metric.tsx`: refreshed UI from the provided visual references with a light branded admin system, white panels, active navigation, centered auth card, module summary cards, icon row actions, and stable table controls.
- `FE/src/features/workspace/app-shell.tsx`: revised the sidebar to match the reference layout more closely with per-module accordion collapse, default-open Organization and Leader groups, icon-only full-sidebar collapse, and visible Organization children for Diocese/Deanery/Parish.
- `FE/src/features/resources/resource-list-page.tsx`: simplified module list pages to a table-first layout with compact breadcrumb/title/action, one full-width filter panel, and full-width table/pagination; summary cards and side panels no longer shrink the list.
- `FE/src/features/resources/resource-toolbar.tsx`: removed duplicate status filter chips and kept a single status select plus filter button to match the reference list screens.

## Validation

- Preflight source docs read before bootstrap.
- Bootstrap hash verification completed.
- Scaffold task preflight read the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- Dependency install and lockfile sync completed with `npm.cmd install` and `npm.cmd install --package-lock-only`.
- Implementation/test preflights reread DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run api:generate`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: 7 files passed, 7 tests passed.
- `npm.cmd run build`: passed.
- `npm.cmd run test:e2e`: 3 projects passed at 1440px, 1024px, and 390px. Playwright Chromium was installed locally before this run.
- Runtime Slot fix preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after the Button Slot fix.
- `npm.cmd run lint`: passed after the Button Slot fix.
- `npm.cmd run test -- src/components/ui/button.test.tsx`: passed, 1 file and 2 tests.
- Auth error-display fix preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after the auth error-display fix.
- `npm.cmd run lint`: passed after the auth error-display fix.
- `npm.cmd run test -- src/features/auth/login-view.test.tsx src/lib/api/client.test.ts`: passed, 2 files and 3 tests.
- `npm.cmd run test`: passed, 8 files and 10 tests.
- Current-session logout FE preflight reread the DOCX guide, `BE/project.md`, and `FE/agent.md`.
- `npm.cmd run typecheck`: passed after the FE logout update.
- `npm.cmd run lint`: passed after the FE logout update.
- `npm.cmd run test`: passed after the FE logout update, 8 files and 10 tests.
- Management UI design preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `git fetch origin` and `git pull --ff-only origin main`: local `main` was up to date before creating `feature/management-ui-design`.
- `npm.cmd run typecheck`: passed after the grouped menu/resource/dashboard refresh and test relocation.
- `npm.cmd run lint`: passed after removing the unused dashboard import and avoiding raw `<img>` in the generic table avatar.
- `npm.cmd run test`: passed after moving unit tests to `tests/unit`, 8 files and 10 tests.
- `rg --files src | rg "(test|spec)\.(ts|tsx)$|^src/test/"`: no results, confirming tests are out of `src`.
- `npm.cmd run build`: passed with Next.js 16 production build.
- FE modular-refactor preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- Mandatory modularization rule added to this agent file: split code by module, feature, and component for reuse; avoid oversized manual files with mixed responsibilities.
- Route/resource modular refactor line-count check: `routes.ts` reduced to 24 lines, `resource-view.tsx` reduced to 63 lines; generated `schema.d.ts` remains intentionally untouched.
- `npm.cmd run typecheck`: passed after splitting route groups and resource components/hooks.
- `npm.cmd run lint`: passed after the modular refactor.
- `npm.cmd run test`: passed after the modular refactor, 8 files and 10 tests.
- `npm.cmd run build`: passed after the modular refactor with Next.js 16 production build.
- Resource pagination enhancement preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after adding page jump and page-size controls to the reusable resource pagination footer.
- `npm.cmd run lint`: passed after the resource pagination enhancement.
- `npm.cmd run test`: passed after the resource pagination enhancement, 8 files and 10 tests.
- `npm.cmd run build`: passed after the resource pagination enhancement with Next.js 16 production build.
- Resource page-button pagination correction preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after replacing the page number input with clickable page buttons.
- `npm.cmd run lint`: passed after replacing the page number input with clickable page buttons.
- `npm.cmd run test`: passed after replacing the page number input with clickable page buttons, 8 files and 10 tests.
- `npm.cmd run build`: passed after replacing the page number input with clickable page buttons with Next.js 16 production build.
- Resource pagination page-change fix preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after preventing the search debounce from resetting page changes.
- `npm.cmd run lint`: passed after preventing the search debounce from resetting page changes.
- `npm.cmd run test`: passed after preventing the search debounce from resetting page changes, 8 files and 10 tests.
- `npm.cmd run build`: passed after preventing the search debounce from resetting page changes with Next.js 16 production build.
- Resource user-facing page URL fix preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after making URL page one-based while keeping API page zero-based.
- `npm.cmd run lint`: passed after making URL page one-based while keeping API page zero-based.
- `npm.cmd run test`: passed after making URL page one-based while keeping API page zero-based, 8 files and 10 tests.
- `npm.cmd run build`: passed after making URL page one-based while keeping API page zero-based with Next.js 16 production build.
- Reference-image UI refresh preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- `npm.cmd run typecheck`: passed after replacing `ResourceView` with module-owned resource screens.
- `npm.cmd run lint`: passed after the module-owned UI refresh.
- `npm.cmd run test`: passed after the module-owned UI refresh, 8 files and 10 tests.
- `npm.cmd run build`: passed after the module-owned UI refresh with Next.js 16 production build.
- `npm.cmd run test:e2e`: passed after the login redesign at 1440px, 1024px, and 390px.
- Reference-alignment correction preflight reread the DOCX guide, `BE/project.md`, `FE/agent.md`, and `FE/DESIGN.md`.
- Manual Playwright mock opened `/leaders` with mocked `/auth/me` and `/leaders`, confirming sidebar shows Organization with Giáo phận/Giáo hạt/Giáo xứ and separate Huynh trưởng group, while the list table stays full-width.
- Admin-diocese real-login menu gap traced to BE `/api/auth/me.permissions`, not FE route rendering: FE keeps menu visibility permission-prefix based, while BE branch `fix/admin-diocese-menu-permissions` seeds missing scoped organization/leader grants and adds `organization.leader.read.diocese/deanery`.
- Organization action rule from BE: scoped admin roles read descendant organization lists, update only their own managed unit, and may create/toggle only direct-child units. FE hides create buttons through route `primaryActionPermissionPrefixes`, so `ADMIN_DIOCESE` does not see "Thêm giáo phận", can see "Thêm giáo hạt", and does not see "Thêm giáo xứ".
- `npm.cmd run typecheck`: passed after the direct-child organization action permission correction.
- `npm.cmd run typecheck`: passed after the accordion sidebar and table-first list correction.
- `npm.cmd run lint`: passed after the accordion sidebar and table-first list correction.
- `npm.cmd run test`: passed after the accordion sidebar and table-first list correction, 8 files and 10 tests.
- `npm.cmd run build`: passed after the accordion sidebar and table-first list correction with Next.js 16 production build.
- `npm.cmd run test:e2e`: passed after the correction at 1440px, 1024px, and 390px.

### All-module form workflow rollout 2026-07-15

- Branch `feature/all-module-form-workflows` starts from `origin/main` and stays local until a separate commit/push request.
- Workspace route registry now carries dynamic create/edit/score/matrix route metadata, `idField`, and per-action permission metadata.
- Corrected FE permission prefixes for training participation workflow, system account manage, system role CRUD, account-role assign, role-permission assign/revoke, account-permission manage, and SUPER_ADMIN-only permission writes.
- Public mutation routes use `/new` and `/:id/edit`; workflow exceptions include `/training/registrations/new` and `/training/participations/:id/score`.
- Shared form primitives live under `src/features/forms`, with module-owned specs split across organization, personnel, training/certificate, workflow, and system files. Runtime forms call real APIs; MSW remains test-only.
- Resource list actions are no longer unconditional: detail uses `?detail=`, edit uses the configured edit path, toggle/delete/approve open dialogs, and assignment has no delete action.
- Dashboard notifications now read `/api/system/notifications`; work queue reads `/api/analytics/work-queue`; analytics filters send `fromDate`, `toDate`, `timeBucket`, and `groupBy`.
- Nullable edit fields use an explicit clear checkbox that maps to `clearFields`, while empty values continue to mean no change.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` passed.

### SaaS UI optimization rollout 2026-07-17

- UI creation and UI changes must use the local UIPro skill as a design input, then reconcile the output with `FE/DESIGN.md` and the existing Next.js/Tailwind/Phosphor stack.
- SaaS/admin UI pass refreshed global tokens, app shell, buttons, inputs, resource tables, filters, pagination, detail drawers, forms, dashboard cards, and analytics charts without changing API endpoints, permissions, route flow, query state, or mutation behavior.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run test:e2e`, and `git diff --check` passed.

### FE module refactor + Hallmark UI pass 2026-07-21

- Branch `feature/fe-module-refactor-ui` starts from up-to-date `main` and remains local; no commit or push was performed.
- `src/app` is route-only: dashboard routes now live under `src/app/(dashboard)`, the dashboard layout owns `AuthGate` + `AppShell`, and `[...segments]/page.tsx` remains a thin catch-all adapter to the route registry.
- `src/features` was removed after import migration. Module-owned screens now live under `src/modules/auth`, `dashboard`, `analytics`, `organizations`, `leaders`, `executive-board`, `training-courses`, `training-workflow`, `certificates`, `accounts`, and `workspace`.
- Shared resource primitives moved to `src/components/common/resource`; shared resource form primitives moved to `src/components/form/resource-form`; route/menu config moved to `src/config/routes`.
- Shared resource list composition was split after the initial migration: common now exposes `resource-list-runtime`, `resource-list-header`, `resource-list-empty-state`, `resource-list-types`, and `resource-list-utils`; module wrappers own their labels and domain rules such as SUPER_ADMIN organization create visibility and certificate/training approval endpoints.
- Form specs moved beside their owning domains: organizations, leaders/personnel, training-courses, training-workflow, and accounts/system. Existing payload mapping, option endpoints, query params, page semantics, action dialogs, and RBAC checks were preserved.
- Hallmark pass used Be Vietnam Pro, light SaaS/admin surfaces, the HR navy/teal OKLCH palette, neutral panels/text, Phosphor Icons, and data-dense operational layout.
- Hallmark metadata was written to `.hallmark/preflight.json` and `.hallmark/log.json`. Central tokens now live in `src/styles/tokens.css` and are imported by `src/app/globals.css` without removing Tailwind v4 `@import "tailwindcss"`.
- Unit test files moved from `tests/unit/features` to `tests/unit/modules`; tests remain outside `src`.
- Visual artifacts were captured under `visual-artifacts/fe-module-refactor-ui`: 63 screenshots across `/login`, `/dashboard`, `/analytics`, `/leaders`, `/organization/dioceses`, `/system/accounts`, `/leaders/new`, a `?detail=` drawer, and a filter drawer at 1440, 1024, 768, 414, 390, 375, and 320 widths.
- Verification run in this session: `rg "@/features" src tests` no results; `rg --files src | rg "(test|spec)\.(ts|tsx)$|^src/test/"` no results; `git diff --check` passed; `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, and `npm.cmd run test:e2e` passed.

## Remaining FE work

- Expand form specs with richer domain-specific option/context endpoints when backend adds the remaining context APIs.
- Add live smoke with real E2E credentials from ignored env when available.
- Repeat the authenticated visual audit against a real seeded test account when shared E2E credentials become available; current 2026-07-21 audit used Playwright API mocks for dashboard, analytics, resource lists, create form, detail drawer, and filter drawer.
- Add richer tests for chart reduced-motion toggling and STOMP reconnect payload behavior with MSW/browser mocks.

### SUPER_ADMIN RBAC scope rollout 2026-07-15

- Branch `feature/super-admin-rbac-scope` starts from `origin/main` and implements SUPER_ADMIN-specific sidebar, organization, account, role, role-permission, and account-permission UX.
- SUPER_ADMIN sidebar hides `leader`, `executive-board`, `training`, `training-workflow`, and `certificate`; direct URL access to those resource routes is also blocked client-side.
- Organization resource actions for SUPER_ADMIN are read-first: dioceses can still be created and toggled, dioceses cannot be edited/deleted, and deaneries/parishes are read-only.
- SUPER_ADMIN account list/filter is applied as a runtime overlay only for SUPER_ADMIN: it shows `SUPER_ADMIN` and `ADMIN_DIOCESE`, removes deanery/parish filters, and displays `dioceseName`. Admin unit accounts keep the normal account UI with role, diocese, deanery, and parish scope filters.
- Account create has a SUPER_ADMIN-only form spec that exposes only `SUPER_ADMIN` and `ADMIN_DIOCESE`; normal admin unit account creation keeps the dynamic `/system/roles` selector and scope/leader fields.
- Role list overlay for SUPER_ADMIN exposes system roles plus custom roles created by `super-admin`; non-SUPER_ADMIN role UI remains governed by the existing scoped role read behavior.
- Role-permission and account-permission bulk checkbox forms are SUPER_ADMIN-only form specs. Non-SUPER_ADMIN users keep the single-permission assignment forms and status columns from the shared admin UI.
- Role-permission and account-permission SUPER_ADMIN tables no longer display `status`; UX treats `effect` as the active allow/deny signal for those SUPER_ADMIN screens.
- Bulk role/account permission forms use checkbox lists with search, grouping, per-group select/clear, and selected counters, posting to `/api/system/role-permissions/bulk` and `/api/system/account-permissions/bulk`.
- Resource list/form summary panels were removed from module screens; table, filter, pagination, dialogs, and primary actions remain the main workflow.
- Follow-up correction in this session restored Vietnamese accents in the changed FE files and separated SUPER_ADMIN overlays from admin unit UI.

### Account-role and role-permission assignment correction 2026-07-15

- The shared route helper now treats `.assign.` permissions as valid primary create actions, so `/system/account-roles` and `/system/role-permissions` show their assignment buttons for any actor with the matching assign permission prefix.
- `/system/account-roles/new` now uses a bulk checkbox form: select one managed account, tick multiple roles from `/system/account-roles/assignable-roles`, optionally choose a primary role, and submit once to `/system/account-roles/bulk`.
- `/system/role-permissions/new` now uses the bulk checkbox form for all actors with `system.role_permission.assign.*`, not only SUPER_ADMIN, and submits `{roleCode, permissionCodes, effect, conditions?, assignedAt?, expiresAt?}` to `/system/role-permissions/bulk`.
- Role-permission and account-role filters use role dropdowns instead of free-text role entry where the backend exposes option endpoints.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` passed.
- Follow-up filtering correction: account-role, role-permission, and account-permission bulk checkbox fields now build option endpoints from the selected target and only show roles/permissions that are not already assigned. Changing the target prunes stale selected checkbox values before submit.
- `/system/account-roles` is not SUPER_ADMIN-only; it is visible to any actor whose `/auth/me.permissions` contains `system.account_role.assign.*`, including `ADMIN_DIOCESE`, `ADMIN_DEANERY`, and `ADMIN_PARISH` with their scoped assign permission.
- `/auth/me` now reloads the effective principal from the backend database, so sidebar/menu visibility follows current RBAC rows instead of stale permission claims embedded in an older token snapshot.
- Real-world admin-diocese menu gap root cause: a direct account-permission `DENY` on `system.account_role.assign.diocese` overrides the role-level `ALLOW`, so the sidebar hides `Gán vai trò` even when `role_permission` looks correct. The backend now removes stale denies for required admin-unit assignment permissions and rejects recreating them.
- Re-enabling a role does not recreate its permission matrix. If a custom role like `LD_TRUONG` has zero `role_permission` rows, users assigned to that role still resolve zero effective permissions after login and will not regain screen access until the role is granted permissions again.

### SUPER_ADMIN account filter drawer correction 2026-07-16

- Branch `feature/super-admin-account-filter-drawer` starts from up-to-date `origin/main`.
- Resource list filters now collapse into a shared `Bộ lọc` drawer across management screens; search remains visible, active filter count is shown on the button, and reset clears status/filter params together.
- Status selects now rely on the explicit `{ value: "all", label: "Tất cả" }` option and no longer render the duplicate empty-value "Tất cả" row.
- Account tables no longer show the `leaderFullName` column. SUPER_ADMIN account list now shows username, primary role name, diocese name, and status; the normal account list shows username, primary role name, deanery name, parish name, and status.
- Account row actions no longer expose delete. Accounts with toggle permission use the status switch action instead, including SUPER_ADMIN account management.
- Account detail drawer hides leader/deanery/parish implementation ids and role code fields. It shows `Vai trò chính` from `primaryRoleName` and `Vai trò phụ` from `secondaryRoleNames`.
- Account edit is no longer exposed by the account management UI. Create forms omit hidden role-dependent fields from payloads, so switching to `SUPER_ADMIN` does not keep stale leader/diocese values. SUPER_ADMIN accounts no longer show or submit `dioceseId`.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` passed.

### Account action and filter follow-up 2026-07-16

- Account row actions now hide the toggle switch for the current logged-in username for every role.
- Account rows with `primaryRoleCode=SUPER_ADMIN` no longer show edit or toggle actions; direct edit URLs render a blocked state instead of the mutation form.
- SUPER_ADMIN account filters now submit response-safe keys `roleCode` and `dioceseId` inside `filters` JSON to avoid invalid account-list filter requests.
- SUPER_ADMIN account create form no longer exposes `leaderId` for `ADMIN_DIOCESE`; ADMIN_DIOCESE create now uses only role, diocese, and credential email.
- Account create forms use a compact account layout. SUPER_ADMIN create keeps the single `roleCode` contract for `SUPER_ADMIN`/`ADMIN_DIOCESE`; normal scoped admin create uses `roleCodes` plus `primaryRoleCode`.
- Normal scoped admin account create uses `/leaders/account-candidates` so the leader dropdown only shows leaders in scope without an existing account. The leader selector is searchable and displays leader full name plus parish name.
- Normal scoped admin account create allows multiple roles but requires one primary role. The primary role is selected by a radio inside each checked role item; there is no separate primary-role dropdown.
- Account list filters are permission/scope-aware: `manage.all` and `manage.diocese` show diocese/deanery/parish filters, `manage.deanery` shows deanery/parish, and `manage.parish` shows parish. The backend accepts `roleCode`, `dioceseId`, `deaneryId`, and `parishId` filter keys.
- Generic management tables use a compact row density: smaller table text, shorter header/body rows, tighter padding, and smaller row action icon buttons.
### Role management drawer and form cleanup 2026-07-17

- Branch `feature/role-management-contract-cleanup` starts from `origin/main`.
- `/system/roles` filter drawer now filters by `isSystem` with "Vai trò hệ thống" / "Vai trò tự tạo" options instead of a free-text role-code filter.
- `/system/roles` list columns no longer include `description`; full descriptions remain available in the detail drawer.
- Role toggle actions now use `system.role.toggle.*` in addition to create/update action prefixes so scoped admin role permissions can drive the UI correctly.
- Role create/edit UI no longer renders the `roleCode` field; backend generates the role code from `roleName` and appends a numeric suffix on collision.
- Role row actions no longer expose delete, and the generic delete dialog only opens when the current route has a delete action.
- Detail drawers are wider, render content in two columns, always include "Người tạo" and "Người cập nhật", and show long text fields such as "Mô tả" at full width without line clamp.
- Shared resource labels and badges in `resource-format.tsx` were normalized to Vietnamese UTF-8 labels for the detail/table surfaces touched by this rollout.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, and `git diff --check` passed after removing the role description column and switching role toggle action visibility to `system.role.toggle.*`; the earlier full slice for this rollout also passed `npm.cmd run test` and `npm.cmd run build`.

### Delete-to-toggle RBAC cleanup 2026-07-21

- Branch `feature/toggle-delete-rbac-permissions` removes generic delete actions from resource routing and tables; row actions now expose view/edit/approve/score/toggle only.
- The shared resource runtime no longer opens `?delete=` dialogs or sends DELETE requests. Toggle confirmation is the only destructive-style lifecycle dialog.
- Role-permission and account-permission tables use `effect !== DENY` as the active switch state instead of `status`, matching the backend effect-based contract.
- Route action inference no longer builds delete actions from `.delete.` prefixes. Toggle visibility accepts `.toggle.`, existing management/update permissions, and role-permission assign/revoke permissions where appropriate.
- Captured OpenAPI snapshot and generated `src/lib/api/schema.d.ts` were cleaned of DELETE operations after live capture from `localhost:1007` was unavailable.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd test` passed.
