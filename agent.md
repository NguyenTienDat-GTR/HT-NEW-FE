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

### RBAC assignment rules cleanup 2026-07-22

- Branch `feature/rbac-assignment-rules` starts from up-to-date `main` in both BE and FE.
- `/system/permissions` no longer exposes a `Thêm quyền` action. The captured OpenAPI snapshot and generated `src/lib/api/schema.d.ts` were regenerated after removing `POST /api/system/permissions` and `PermissionCreateRequest`.
- `/system/permissions` filter drawer now uses dropdowns for module/resource/action/scope from `/system/permissions/taxonomy` instead of free-text filter inputs.
- Account create for scoped admins excludes all system/admin role options (`SUPER_ADMIN`, `ADMIN_DIOCESE`, `ADMIN_DEANERY`, `ADMIN_PARISH`) from the multi-role selector.
- Account-role bulk assignment must use `/system/account-roles/assignable-roles`; `ADMIN_DIOCESE` can see and assign `ADMIN_DEANERY` and `ADMIN_PARISH` for accounts in its managed diocese, while role-permission assignment still hides system/admin roles from non-SUPER_ADMIN users.
- `/system/account-permissions/new` now uses the bulk checkbox form for every actor with `system.account_permission.manage.*`, matching `/system/account-roles/new` and submitting multiple `permissionCodes` to `/system/account-permissions/bulk`.
- Bulk assignment forms default assignment dates to the current local datetime. The role-permission bulk form splits setup, conditions, and validity dates into compact sections.
- `/system/account-roles/:id/edit` renders `isPrimary` as a switch instead of a dropdown. Enabling the switch submits `isPrimary=true`; backend clears the other primary roles for the same account.
- Non-SUPER_ADMIN row actions hide edit and status switch controls for system/admin role rows in both `/system/roles` and `/system/role-permissions`; SUPER_ADMIN keeps the system-role management controls allowed by backend authorization.
- The account-role edit primary-role switch uses compact, non-wrapping labels and a fixed track/knob layout so enabling it does not overflow inside the form grid.
- Verification run in this session: `npm.cmd run api:generate`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` passed.

### Vietnamese permission taxonomy labels 2026-07-22

- Branch `feature/vietnamese-permission-labels` starts from up-to-date `main` in both BE and FE.
- `/system/permissions` keeps `permissionCode` as the raw backend code, but maps `moduleCode`, `resourceCode`, `actionCode`, and `scopeCode` to Vietnamese labels in the table and detail drawer.
- The permission filter drawer labels module/resource/action/scope as `Phân hệ`, `Đối tượng`, `Thao tác`, and `Phạm vi`; taxonomy options from `/system/permissions/taxonomy` are localized client-side while preserving the code values sent inside `filters` JSON. If the taxonomy endpoint is unavailable for the current actor, FE falls back to `/system/permissions?page=0&size=100` and builds dropdown values from readable permission rows.
- The same `/system/permissions` filter drawer includes `Hiệu lực` with `ALLOW` and `DENY`, sending `effect` inside the JSON `filters` payload for backend assignment-effect filtering.
- `/system/permissions` status toggle action requires both `SUPER_ADMIN` / `ROLE_SUPER_ADMIN` and `system.permission.toggle.*`; backend migration `V051__seed_permission_toggle_for_super_admin.sql` seeds `system.permission.toggle.all` for `SUPER_ADMIN`. Non-super-admin roles keep the status column visible and do not see a permission catalog toggle switch even if a stale permission prefix exists.
- Shared resource tables now hide only the exact `status` column when the current page has at least one row showing the toggle switch; business-state columns such as `effect`, `approvalStatus`, and `participationStatus` stay visible.
- Verification run in this session: `npm.cmd run typecheck`, targeted `npm.cmd run test -- tests/unit/components/common/resource/permission-taxonomy-labels.test.ts`, targeted `resource-table`, `resource-toolbar`, route-config, and search tests, `npm.cmd run lint`, full `npm.cmd run test`, and `git diff --check` passed.

### Unit status lock and toggle notifications 2026-07-22

- Branch `feature/unit-status-lock-notifications` starts from `origin/main` in both BE and FE.
- `AuthUser` includes `unitLocked`. When it is true, workspace routing exposes only `/notifications`; direct navigation to business URLs redirects back to the notification inbox.
- The bell badge now reads `GET /api/system/notifications/unread-count`, hides at zero, and displays `99+` for counts above 99.
- `/notifications` renders a dedicated inbox with read/unread state, event type, title, message, created time, and click-to-mark-read behavior through `PATCH /api/system/notifications/{id}/read`.
- STOMP `/user/queue/notifications` invalidates both the inbox and unread-count queries. `/user/queue/auth-events` still refreshes the auth session so `unitLocked`, roles, and permissions stay synchronized after unit/RBAC toggles.
- `src/lib/api/schema.d.ts` includes `AuthenticatedUserResponse.unitLocked`, `UnreadNotificationCountResponse`, and `/api/system/notifications/unread-count`.
- `/notifications` now requests `GET /api/system/notifications` as a paged response, uses URL-backed `page`/`size`, and reuses the shared compact pagination footer. Dashboard notifications request the first 4 items from the paged contract.
- Auth refresh STOMP events now refresh the access token, reload `/auth/me`, update the auth store, invalidate resource/auth queries, and call `router.refresh()` so reopening an enabled unit no longer requires a manual F5.
- `/system/permissions` uses entity-safe search fields for module/resource/action/scope to avoid the temporary system-error state when typing a search term.
- `/system/account-roles` shows the status switch for users with either `system.account_role.toggle.*` or the assignment permission accepted by the backend toggle endpoint.
- `/system/role-permissions` and `/system/account-permissions` now expose the same taxonomy filter drawer style as `/system/permissions`: role/account plus module, resource, action, scope, and effect filters. SUPER_ADMIN overrides use the same filter helpers.
- `src/lib/api/schema.d.ts` now models `/api/system/notifications` as `apiResponsePageTrainingNotificationResponse`.
- Backend RBAC writes now compare hierarchy against the actor's active role from the database, so FE must not infer that a broad permission token can affect higher-role accounts or roles. After account-role toggles, refresh account-role/account queries because disabling a primary role can make the backend promote the highest remaining active role as the new primary role.
- Verification run in this session: `npm.cmd run typecheck`, `npm.cmd run lint`, targeted `unit-lock-notifications`, full `npm.cmd run test`, and `npm.cmd run build` passed.
- Follow-up verification: `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run test -- tests/unit/config/routes/system-routes.test.ts tests/unit/modules/workspace/super-admin-route-overrides.test.ts tests/unit/modules/workspace/unit-lock-notifications.test.ts` passed after notification pagination, socket refresh, search/filter, and account-role toggle updates.

### Leader and organization edit layout 2026-07-25

- Branch `feature/leader-org-edit-layout` starts from up-to-date `origin/main` in FE.
- Leader detail profile tab now uses exactly two horizontal sections on desktop styled after the provided reference image: `Thông tin cơ bản` as the wider form grid on the left and `Lịch sử cấp bậc` as the right-side section; mobile/tablet stacks them responsively.
- Leader profile editing now happens inline from the detail page; the list table hides the leader edit action, and the detail header shows `Sửa thông tin hồ sơ` only while the profile tab is active and the user has update permission.
- Leader profile edit action is additionally role-guarded to `ADMIN_PARISH` / `ROLE_ADMIN_PARISH` so `ADMIN_DIOCESE` and `ADMIN_DEANERY` read/create scopes do not expose an update button the backend would reject.
- Leader avatar editing is exposed from the detail header with a `Thay đổi ảnh` picker and preview; the profile sections no longer render a raw image URL field.
- Leader create now uses a dedicated full-page three-step wizard for personal, contact, and organization information; the first step includes a compact avatar picker and fields are capped in a three-column grid on desktop.
- Diocese, deanery, and parish edit forms use the same horizontal section layout so compact fields no longer stack into long vertical forms.
- Verification run in this session: direct `tsc --noEmit`, direct `eslint`, direct `vitest run`, `git diff --check`, and `next build` passed. The first build attempts failed only because sandboxed network could not fetch Google Fonts; rerunning build with network access passed.

### Training Course Type catalog alignment 2026-10-19

- Branch `feature/training-course-type-refactor` (BE + FE), bắt đầu từ `main`, giữ local tới khi có yêu cầu commit/push.
- Theo BE mới: bỏ enum CourseType và bảng điều kiện riêng; loại khóa trở thành catalog `/api/training/course-types` đã bao gồm điều kiện tham dự. Mỗi khóa trỏ tới đúng một loại khóa qua `courseTypeCode`.
- `src/config/routes/route-config.ts`: `ResourceKind` thay `"requirements"` bằng `"course-types"`; `inferRouteFilters` tách case `course-types` (lọc theo `managementUnitType`) và `courses` (lọc loại khóa qua `courseType.typeCode` từ `/training/course-types`, kèm năm).
- `src/config/routes/groups/training.ts`: thay route `/training/requirements` bằng `/training/course-types` (idField `typeCode`, quyền `training.course_type.*`, cột typeCode/typeName/managementUnitType/requiredCurrentLevel/prerequisiteTypeCode/resultingLevel/status). Cột khóa học đổi `courseType` -> `courseTypeCode`.
- `src/modules/training-courses/form-specs.ts`: bỏ enum `courseTypes` hardcode. Spec `requirements` thay bằng spec `course-types` (typeCode, typeName, managementUnitType, certificateShortCode, điều kiện, prerequisiteTypeCode chọn từ catalog, resultingLevel). Spec `courses` bỏ field `requirementCode`; `courseType` enum đổi thành `courseTypeCode` chọn từ `/training/course-types`.
- `src/components/common/resource/resource-format.tsx`: thêm nhãn cho courseTypeCode/courseTypeName/typeCode/typeName/managementUnitType/prerequisiteTypeCode/resultingLevel/certificateShortCode.
- `src/components/common/resource/permission-taxonomy-labels.ts`: thêm nhãn resource `course_type`.
- `src/modules/leaders/components/leader-detail-utils.ts`: `CourseParticipationRow.courseType` -> `courseTypeCode` (BE participation response đổi tên field).
- Kiểm thử trong session này: `npm run typecheck` PASS; `npm run lint` PASS (0 error, 3 warning có sẵn, không liên quan). `npm run test` KHÔNG chạy được trong môi trường agent (VM Linux thiếu native binding `@rolldown/binding-linux-x64-gnu` do node_modules là bản Windows); cần chạy `npm run test`, `npm run build`, `npm run test:e2e` trên môi trường Windows.
- `src/lib/api/schema.d.ts` là file sinh tự động, hiện vẫn là bản cũ (không file nguồn nào import type training cũ nên typecheck vẫn pass). Cần chạy `npm run api:generate` sau khi BE mới chạy để cập nhật `/api/training/course-types`, `TrainingCourseTypeResponse`, `courseTypeCode`.

## 2026-10-19 - Thành phần điểm có hệ số, bỏ công thức điểm (branch `feature/score-component-weights`, từ `main`)

BE tương ứng: branch `feature/score-component-weights`, migration `V057`, xem `BE/project.md` mục "Training Score Component Workflow".

Logic mới:
- Module "Công thức điểm" (`/training/score-formulas`) đã bị XÓA khỏi FE (route, form spec, filter, label quyền `score_formula`).
- Thành phần điểm (`/training/score-components`) giờ gắn một loại khóa (`courseTypeCode`, chọn từ `/training/course-types`, chỉ chọn lúc tạo), có `coefficient` (hệ số, > 0) và cờ `includeInFinal` (switch "Tính vào điểm tổng kết", mặc định bật). Tắt cờ thì thành phần vẫn nhập điểm nhưng KHÔNG tính vào điểm tổng kết.
- Điểm tổng kết (BE tính) = trung bình có hệ số: Σ(điểm × hệ số) / Σ hệ số của các thành phần `includeInFinal = true`.
- Form tạo thành phần điểm KHÔNG còn chọn cấp quản lý (`unitType`): BE suy ra từ loại khóa; dropdown loại khóa do BE lọc theo phạm vi tài khoản (giáo hạt/giáo phận).
- Form khóa huấn luyện: bỏ `scoreFormulaId`, thêm `passingScore` (điểm đạt, bắt buộc). Cột bảng chấm điểm dùng `passingScore` thay `scoreFormulaId`.

File đã đổi: `src/modules/training-courses/form-specs.ts`, `src/config/routes/groups/training.ts`, `src/config/routes/groups/training-workflow.ts`, `src/config/routes/route-config.ts` (bỏ kind `score-formulas`, thêm filter loại khóa cho `score-components`), `src/components/form/resource-form/types.ts` + `form-controls.tsx` (field `switchLabels` để switch không bị cứng nhãn "Vai trò chính/phụ"), `src/components/common/resource/resource-format.tsx` (nhãn `coefficient`, `includeInFinal`), `src/components/common/resource/permission-taxonomy-labels.ts`, `src/modules/training-workflow/form-specs.ts`.

Kiểm thử: `npm run typecheck` PASS; `npx vitest run` 43/44 PASS - 1 fail có sẵn ở test sidebar (`toHaveClass("rounded-[10px]")`), không liên quan; eslint các thư mục đã sửa không lỗi.

Còn lại / lưu ý cho phiên sau:
- `src/lib/api/schema.d.ts` và `openapi/ht-management.json` CHƯA cập nhật (cần chạy BE rồi `npm run api:capture && npm run api:generate`); vẫn chứa schema `ScoreFormula*`.
- Form chấm điểm (`participations` action `score` trong `modules/training-workflow/form-specs.ts`) vẫn nhập text `componentCode | score` và gửi `componentCode`, trong khi BE yêu cầu `componentId` - lỗi có từ trước; nên làm form lấy danh sách thành phần của khóa (id, tên, hệ số, cờ tính tổng kết) rồi gửi `componentId`. Response participation trả `componentScores[].coefficient/includeInFinal`.
- Chưa test thủ công trên UI (BE/DB cần chạy); migration V057 chưa được chạy thử trên Postgres thật.

## 2026-10-19 - Đóng/mở đăng ký, người nhận danh sách, điểm đạt, hiển thị tên (cùng branch `feature/score-component-weights`)

BE tương ứng: `BE/project.md` mục "Training Course Registration Control and Recipients (V058)".

- Danh sách khóa: cột "Trạng thái đăng ký" (`registrationOpen` + khung thời gian -> Đang mở / Đã đóng / Chưa đến giờ / Hết hạn, logic ở `src/modules/training-courses/registration-state.ts`). Nút khóa/mở khóa ở cột thao tác (`modules/training-courses/components/registration-toggle-button.tsx`, gọi `PATCH /training/courses/{code}/registration`), chỉ hiện với người có quyền sửa khóa; vô hiệu khi đã hết hạn đăng ký (phải gia hạn trước). BE tự đóng khi hết hạn.
- Form khóa: thêm `recipientUsernames` (checkbox-list) lấy từ `GET /training/courses/recipient-candidates?courseTypeCode=` (lọc quyền duyệt + phạm vi tài khoản đăng nhập, phụ thuộc loại khóa đã chọn); khi sửa luôn gửi mảng (kể cả rỗng) để bỏ chọn được. Form đăng ký tham dự đã bỏ ô "Tài khoản nhận thông báo".
- `FormFieldSpec.dynamicHelper` (types.ts + `DynamicHelper` trong form-controls.tsx): tip động lấy từ API; dùng cho `passingScore` (gọi `/training/courses/passing-score-limit`, đỏ khi vượt). BE vẫn chặn khi lưu.
- Input `datetime` (form-controls.tsx `toDatetimeLocalValue`) đã load được giá trị khi sửa (ISO có múi giờ -> giờ VN UTC+7).
- Chi tiết khóa (`detail-drawer.tsx`): ẩn `courseCode`, `courseTypeCode`, `dioceseId`, `deaneryId`; hiển thị `courseTypeName` (nhãn "Loại khóa"), `dioceseName`/`deaneryName`, người tạo/cập nhật (`createdBy`/`updatedBy`).
- Kiểm thử: `npm run typecheck` PASS, eslint các thư mục đã sửa sạch, `vitest` 43/44 (1 fail sidebar có sẵn). Chưa test UI thật; `schema.d.ts` vẫn chưa regenerate. Migration V058 chưa chạy thử trên Postgres thật.

## 2026-10-19 - Bộ lọc/cột trạng thái khóa, tự chuyển trạng thái, thông báo RabbitMQ, picker người nhận có tìm kiếm (cùng branch `feature/score-component-weights`)

BE tương ứng: `BE/project.md` mục "Training Course Registration Control and Recipients" (V059: `registrationStatus`, `organizingStatus`).

- Bộ lọc danh sách khóa (`config/routes/route-config.ts` case `courses`): "Thời gian đăng ký" (`registrationStatus`: Đang mở / Chưa đến giờ / Đã đóng thủ công / Đã hết hạn) và "Thời gian tổ chức" (`organizingStatus`: Sắp diễn ra / Đang diễn ra / Đã kết thúc).
- Cột bảng: `registrationStatus` và `organizingStatus` (thay `registrationOpen`) render Badge theo token màu (`success`, `info`, `warning` suy từ token `--warning`, `muted`); map tone/nhãn ở `modules/training-courses/registration-state.ts`, ưu tiên giá trị BE, fallback tính từ khung thời gian. Badge thêm tone `info`; tone `warning` đổi từ amber cứng sang token.
- Nút khóa/mở khóa chỉ bật khi trạng thái OPEN/CLOSED; chưa đến giờ/hết hạn thì tự động (BE).
- Picker người nhận danh sách đăng ký: field `multiselect` + `searchable: true` -> `SearchableMultiSelect` trong `form-controls.tsx` (dropdown, chip đã chọn, ô tìm theo tên/tài khoản không phân biệt dấu, "chọn tất cả kết quả").
- Thông báo đóng/mở đăng ký đi qua RabbitMQ, chỉ lưu DB (không socket) nên `useUnreadNotificationCount` (`modules/notifications/hooks.ts`) thăm dò mỗi 60s và refetch khi focus lại cửa sổ.
- Test: `tests/unit/registration-state.test.ts`; `npm run typecheck` PASS, eslint sạch, vitest 45/46 (1 fail sidebar có sẵn). Chưa test UI thật; `schema.d.ts` chưa regenerate; migration V059 chưa chạy thử trên Postgres thật.

## 2026-10-19 - Sửa lỗi 429 khi đổi bộ lọc khóa huấn luyện

- Nguyên nhân: mỗi lần đổi bộ lọc danh sách khóa bắn 1 request danh sách + 2 KPI trạng thái + 14 KPI theo mã loại khóa cũ (`SMTL_DT`...; mã loại khóa nay là UUID nên các KPI này vốn đã sai) -> vượt giới hạn đọc 120 request/phút của BE.
- Đã bỏ KPI theo loại khóa trong `components/common/resource/resource-kpis.ts` (chỉ còn Tổng / Đang hoạt động / Tạm ngưng cho khóa) và cache KPI 60s + `keepPreviousData` trong `resource-list-runtime.tsx`. Các màn khác (leaders 9 KPI cấp bậc, positions 3) vẫn bắn nhiều request mỗi lần đổi bộ lọc - nếu gặp 429 tiếp thì gộp KPI thành một endpoint thống kê ở BE.
- Message 429 từng bị mojibake do BE thiếu charset UTF-8 (đã sửa ở BE, xem `BE/project.md`).

## 2026-10-19 - Thông báo đóng/mở đăng ký realtime qua socket + RabbitMQ

- Bỏ polling 60s ở `useUnreadNotificationCount` (đã thêm trước đó). `modules/workspace/hooks/notifications-socket.ts` giữ một kết nối STOMP duy nhất (chỉ heartbeat khi rảnh); khi BE đẩy thông báo thì invalidate danh sách/số chưa đọc, và nếu `eventType` bắt đầu bằng `training.course.registration_` thì invalidate luôn `["resource","/training/courses"]` để trạng thái đăng ký cập nhật ngay.
- BE: consumer RabbitMQ lưu thông báo rồi đẩy STOMP tới người đang online (xem `BE/project.md`); người offline đọc lại qua REST.

## 2026-10-19 - Vì sao socket không nhận thông báo realtime

- Nguyên nhân gốc nằm ở BE: handshake WebSocket `/ws/notifications` bị Spring Security chặn 401 (trình duyệt không gắn được header Authorization khi nâng cấp WebSocket), nên `useNotificationsSocket` không bao giờ kết nối được dù FE đúng. Đã mở `permitAll` cho handshake; xác thực vẫn do STOMP CONNECT (Bearer) đảm nhiệm. Xem `BE/project.md` mục "WebSocket handshake security".
- Sau khi BE restart (devtools tự restart khi build), socket FE tự nối lại sau 5s (`reconnectDelay`); nếu vừa sửa mà chưa thấy, tải lại trang một lần.

## 2026-10-19 - Picker người nhận: hiện vai trò, sửa lỗi đóng dropdown khi tick

- Option người nhận hiển thị "Họ tên - tài khoản - Vai trò" (`optionLabelFields` thêm `roleName` từ `recipient-candidates`).
- `SearchableMultiSelect` (`form-controls.tsx`): bỏ `onBlur` trên container (bấm vào nhãn/checkbox không phải phần tử focus được nên `relatedTarget` null -> đóng dropdown trước khi tick). Nay đóng bằng listener `mousedown` ngoài vùng + phím Escape.

## 2026-10-19 - Khóa huấn luyện: số năm hoạt động, lập danh sách đăng ký, tab quy trình (branch `feature/course-years-active-registration-lists`, từ `main`)

- Form khóa: thêm `yearsActive` ("Số năm hoạt động", mặc định 0, `min: 0`; `FormFieldSpec.min` được kiểm tra khi submit). Cột `yearsActive` ở danh sách khóa.
- Form "Đăng ký tham dự": ô chọn khóa dùng `/training/courses/registrable` (chỉ khóa đang mở, đúng phạm vi). Hai trường kiểu mới `registration-list` (`components/form/resource-form/registration-list-field.tsx`): nút "Lập danh sách" (modal chọn nhiều bằng checkbox) và "Thêm ngoại lệ" (modal chọn 1 người kèm lý do, thêm tiếp được). Modal có tìm kiếm tên/giáo xứ/giáo hạt, bộ lọc giáo hạt -> giáo xứ theo phạm vi, phân trang; hai danh sách loại trừ lẫn nhau (cả FE lẫn BE báo lỗi). Đổi khóa thì reset cả hai danh sách.
- Quy trình huấn luyện: 4 menu (Đăng ký tham dự, Duyệt đăng ký, Danh sách tham dự, Chấm điểm) đã bỏ khỏi sidebar cùng menu cha; route vẫn khai báo (`trainingWorkflowRouteGroup` nằm ngoài `routeGroups` nhưng trong `routes`) cho form, liên kết và phân quyền. Chi tiết khóa `/training/courses/:id` (`modules/training-courses/components/course-detail-page.tsx`) có 4 tab `?tab=registrations|approvals|participations|scores`, mỗi tab dùng lại `TrainingWorkflowResourceView` lọc theo khóa qua `EmbeddedResourceProvider` (`components/common/resource/embedded-resource-context.tsx`: bộ lọc cố định `course.courseCode`, liên kết hành động giữ nguyên trang chứa, form tạo/chấm điểm nhận `returnTo` và `courseCode`). Tab ẩn theo quyền.
- Phạm vi giáo xứ: thấy menu "Khóa huấn luyện" (route cho phép prefix `training.participation.submit.parish`), chỉ khóa đang mở trong phạm vi, chi tiết khóa chỉ có tab "Đăng ký tham dự" (các tab khác yêu cầu quyền giáo hạt/giáo phận).
- Danh sách tham dự và chấm điểm dùng endpoint `/training/participants` (chỉ hồ sơ đã duyệt).
- Duyệt: nút "Từ chối" (bắt buộc lý do) cùng quyền duyệt; cột trạng thái duyệt gộp thành `approvalStatus`; chọn nhiều hồ sơ để "Duyệt đã chọn"/"Từ chối đã chọn" (`/training/registrations/bulk-approval`, báo số hồ sơ lỗi); nút duyệt/từ chối chỉ hiện với hồ sơ chờ duyệt.
- Thu hồi đăng ký (`DELETE /training/registrations/:id`): nút chỉ hiện cho người gửi (so `row.createdBy` với `user.leaderId || user.username`) khi hồ sơ còn chờ duyệt. Xóa khỏi danh sách tham dự (`DELETE /training/participants/:id`): nút cho người có quyền duyệt, ẩn khi chứng nhận đã duyệt.
- Cột Giáo xứ/Giáo hạt và bộ lọc tương ứng ở cả 4 tab. Bộ lọc con phụ thuộc bộ lọc cha qua `RouteFilterConfig.dependsOn` (giáo hạt theo giáo phận, giáo xứ theo giáo hạt; đổi cha thì xóa giá trị con) ở tab quy trình, huynh trưởng, tài khoản và bộ lọc super admin; helper `deaneryUnitFilter`/`parishUnitFilter` trong `route-config.ts`.
- Bộ lọc trạng thái ở các tab quy trình được rút gọn và việt hóa (đăng ký: Đã đăng ký/Đã tham dự/Từ chối; duyệt: Chờ xử lý/Đã duyệt/Từ chối; tham dự: Đã tham dự/Hoàn thành; chứng nhận: Không yêu cầu/Chờ xử lý/Đã duyệt/Từ chối); nhãn các trạng thái tham dự trong `route-config.ts`.
- Kiểm thử: `tsc`, eslint và `vitest` (trừ `button.test.tsx` fail sẵn từ trước) pass; routing test mới ở `tests/unit/config/routes/training-workflow-routes.test.ts`. Chưa kiểm tra bằng trình duyệt thật trong phiên này.

## 2026-10-20 - Nhập điểm trực tiếp, khóa/mở điểm, xóa khỏi danh sách tham dự (cùng branch `feature/course-years-active-registration-lists`)

- Tab "Chấm điểm" (`ResourceListRuntime` + `score-entry.ts`): thêm cột cho từng thành phần điểm của khóa (`GET /training/courses/:code/score-components`) với ô nhập số ghi thẳng vào từng hàng hồ sơ; ô sai (âm hoặc quá điểm tối đa) viền đỏ, ô đã sửa được tô nhẹ. Nút "Lưu điểm (n)" nằm cạnh nút Bộ lọc (`ResourceFilters.extraActions`), chỉ bật khi có hồ sơ bị sửa điểm. Lưu chạy nền (`saveScoresInBackground`): không khóa giao diện, tối đa 4 request `PATCH .../score` song song (`runWithConcurrency`), kết quả báo qua toast; bản nháp chỉ bị bỏ khi người dùng chưa sửa tiếp trong lúc lưu. Hồ sơ thiếu điểm/sai khoảng bị bỏ qua và báo tên huynh trưởng. Khi lưu gửi kèm `review` hiện có để không làm mất ghi chú duyệt.
- Bỏ nút chấm điểm ở từng hàng, bỏ cột/bộ lọc duyệt chứng nhận ở tab Chấm điểm và Danh sách tham dự, bỏ cột "Tên khóa" khi nhúng trong chi tiết khóa, thêm cột STT và bỏ KPI cards ở cả 4 tab (`EmbeddedResource` context). Điểm đạt và "Khóa chỉnh sửa điểm" nằm trong dải thông tin khóa đã thu gọn.
- Chỉ nhập điểm được khi khóa đang diễn ra: `isCourseWithinDates` (`registration-state.ts`, tính từ `startDate/endDate` theo giờ Việt Nam, giống BE; không dựa trạng thái lưu để tránh lệch) -> `EmbeddedResource.scoringOpen`; chi tiết khóa tải lại mỗi lần vào trang. Ngoài khoảng đó ô điểm bị khóa, nút lưu bị vô hiệu hóa và hiện dải thông báo.
- Khóa/mở chỉnh sửa điểm: người có quyền `training.participation.lock.*` (admin giáo phận/giáo hạt) thấy nút "Khóa chỉnh sửa điểm"/"Mở chỉnh sửa điểm" ở tab Chấm điểm (`PATCH /training/courses/:code/score-lock`); khi khóa (`course.scoreLocked`) các ô điểm và nút lưu bị vô hiệu hóa. Nhãn quyền hành động `lock` = "Khóa/mở" trong `permission-taxonomy-labels.ts`.
- Tab "Danh sách tham dự": nút thùng rác "Xóa khỏi danh sách tham dự" (`DELETE /training/participants/:id`, hành động `remove` cần quyền duyệt), ẩn khi chứng nhận đã duyệt; hộp thoại xác nhận dùng `ConfirmActionDialog` (`requireConfirmText=false`).
- Drawer chi tiết hồ sơ tham dự: ẩn UUID (id, huynh trưởng, giáo xứ, giáo hạt, mã khóa/loại khóa và mọi giá trị dạng UUID, kể cả người tạo/duyệt) và các trường trùng (`result`, cờ `status`, cấp quản lý; tên khóa và điểm đạt khi nhúng trong chi tiết khóa), thứ tự trường cố định, nhãn tiếng Việt đầy đủ, điểm thành phần hiện thành danh sách, người duyệt `SYSTEM_AUTO_APPROVAL` hiện "Hệ thống tự duyệt".
- Form sửa khóa: khi khóa đã có hồ sơ (`hasParticipations` từ chi tiết khóa) các ô loại khóa, năm tổ chức, số năm hoạt động và điểm đạt chuyển sang chỉ đọc (`readOnlyWhen`).
- Thanh công cụ danh sách: phần chọn nhiều hồ sơ (duyệt/từ chối hàng loạt) đứng trước ô tìm kiếm đã thu gọn (`ResourceFilters.leadingActions`).
- Kiểm thử: `tsc`, eslint và `vitest` (trừ `button.test.tsx` fail sẵn từ trước) pass; thêm `tests/unit/components/common/score-entry.test.ts`, `tests/unit/modules/course-dates.test.ts`. Chưa kiểm tra bằng trình duyệt thật.

## Tắt đơn vị tổ chức (nhánh feature/unit-disable-cascade, 2026-10-21)

- Tắt giáo phận / giáo hạt / giáo xứ không đổi trạng thái dữ liệu con; tài khoản thuộc đơn vị chỉ đọc thông báo, dữ liệu đóng băng, bật lại là khôi phục. Chứng nhận đã cấp vẫn hợp lệ.
- `modules/organizations/components/unit-toggle-dialog.tsx`: gọi `GET /{units}/{id}/toggle-impact`, hiện bảng tác động, bắt buộc lý do (tối đa 500 ký tự) khi tắt cộng chữ `Xác nhận`, gửi `{ confirmationText, reason }`. Được `resource-list-runtime.tsx` dùng cho kind `dioceses|deaneries|parishes`.
- `modules/organizations/components/unit-status-history.tsx`: lịch sử bật/tắt trong `unit-detail.tsx` (`GET /{units}/{id}/status-history`).
- `effectiveStatus` từ BE: nhãn "Ngưng theo đơn vị cha" ở cột trạng thái (bảng và chi tiết); `shouldHideStatusColumn` giữ cột này khi có dòng bị khóa theo đơn vị cha.
- Analytics: công tắc "Bao gồm đơn vị ngưng hoạt động" gửi `includeInactiveUnits=true` (`buildAnalyticsQuery` trong `modules/analytics/types.ts`); mặc định số liệu hiện tại loại đơn vị bị khóa, số liệu lịch sử luôn đầy đủ.
- Chưa chạy `npm run api:capture` / `api:generate` (cần BE chạy): các hàm gọi API dùng kiểu cục bộ trong `modules/organizations/types.ts`.
- Test: `tests/unit/modules/organizations/unit-toggle-dialog.test.tsx`, `tests/unit/modules/analytics/build-query.test.ts`, thêm ca trong `resource-table.test.ts`.
