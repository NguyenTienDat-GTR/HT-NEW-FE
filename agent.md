# HT Management FE Agent Log

## Quy tắc làm việc

- Không đọc lại toàn bộ file này hay `BE/project.md` trước mỗi việc (hai file cộng lại khoảng 300 KB). Đọc phần "Kiến trúc FE" và "Route và luồng dữ liệu" bên dưới, rồi tìm theo từ khóa (tên module, endpoint, tên quyền) và chỉ đọc đúng mục liên quan. Mã nguồn là nguồn sự thật; mục nhật ký nào lệch với mã thì mã đúng.
- Việc cần biết hợp đồng API hoặc quy tắc nghiệp vụ phía BE: tìm đúng mục trong `BE/project.md` (repo `HT-NEW`), hoặc xem `openapi/ht-management.json` và `src/lib/api/schema.d.ts`.
- Việc giao diện: đọc `DESIGN.md` và `src/styles/tokens.css`. Dùng skill `ui-ux-pro-max` khi thiết kế màn hình hoặc thành phần mới; kết quả phải khớp `DESIGN.md` và bộ Next.js / Tailwind / Phosphor hiện có.
- Ghi thay đổi của FE vào cuối file này: mỗi nhánh một mục ngắn, chỉ ghi quyết định và hành vi mà đọc mã không thấy ngay. Không dán kết quả chạy lint / test / build và không liệt kê lại danh sách file đã sửa (đã có trong git).
- Thay đổi của BE chỉ ghi ở `BE/project.md`.
- BẮT BUỘC chia nhỏ code theo từng module, feature, component để tái sử dụng; tránh để một file code thủ công quá dài hoặc gom nhiều trách nhiệm không cùng phạm vi.
- Mọi thông báo hiển thị cho người dùng viết bằng tiếng Việt; lưu file UTF-8.
- Trước khi mở PR: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. PR mở vào `test` trước, thử trên môi trường test rồi mới mở PR `test` -> `main`.

## Kiến trúc FE

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4.
- Thư viện chạy: Radix (dialog, dropdown-menu, popover, slot, tooltip), Phosphor Icons, TanStack Query, React Hook Form, Zod, Zustand, openapi-fetch, StompJS, Recharts, Motion, Sonner, ExcelJS, fflate, jsQR, MediaPipe Tasks Vision, react-moveable, react-selecto.
- Kiểm thử và sinh mã: Vitest, Testing Library, Playwright, axe, openapi-typescript.
- `next.config.ts` bật `typedRoutes`, `output: "standalone"` và rewrite `/backend/api/:path*` sang `${BACKEND_ORIGIN}/api/:path*`.
- `.env.example` mô tả `BACKEND_ORIGIN`, `NEXT_PUBLIC_WS_URL`, `E2E_USERNAME`, `E2E_PASSWORD`, không chứa bí mật.
- Thư mục: `src/app` (route mỏng), `src/modules/<nghiệp vụ>` (màn hình và logic), `src/components` (`ui`, `common/resource`, `form/resource-form`), `src/config/routes` (route, menu, quyền), `src/lib` (API client, auth, tiện ích), `src/styles/tokens.css`. Unit test nằm ở `tests/unit`, không đặt trong `src`.

## Route và luồng dữ liệu

- `/login` and `/change-password` render dedicated auth forms with React Hook Form and Zod.
- `/dashboard`, `/analytics`, `/notifications`, organization, training, certificate, and system routes render through the App Router workspace catch-all and route registry.
- Sidebar menu is grouped by module name: dashboard, organization, leader, executive-board, training, training-workflow, certificate, and system.
- Ban điều hành routes now use `/executive-board/positions` and `/executive-board/assignments`; workflow aliases exist for `/training/registrations`, `/training/approvals`, `/training/scores`, `/certificates/approvals`, and `/leaders/profiles`.
- Auth state uses Zustand memory only. Refresh and protected calls use `credentials: "include"`, Bearer access token, single-flight refresh, and retry once.
- Tables sync `page`, `size`, `search`, `sortBy`, and `sortDirection` to URL with 300ms debounce. BaseSearchRequest serializes `filters` as `JSON.stringify`.
- Notifications hydrate from REST and invalidate cache from STOMP `/user/queue/notifications` after connect or message.

## Thiết kế

- Giao diện sáng, phông Plus Jakarta Sans, màu chính xanh `#1e40af`, nền slate; chi tiết ở `DESIGN.md`, giá trị thật ở `src/styles/tokens.css`.
- Thanh bên 260px / 76px. Nút có các biến thể `primary`, `secondary`, `outline`, `ghost`, `destructive`, `icon`; trạng thái đang xử lý khóa bấm lặp.

## Nhật ký thay đổi (cũ trước, mới sau)

Các mục dưới đây ghi theo thời điểm làm; đường dẫn file trong các mục trước 2026-07-21 có thể không còn (thư mục `src/features` đã chuyển sang `src/modules`).

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

## Menu tài khoản, hồ sơ cá nhân, đổi mật khẩu OTP (nhánh `feature/account-menu-change-password`)

- `modules/account/components/account-menu.tsx`: khối tên + avatar trên header thành nút mở menu (Radix DropdownMenu): xem hồ sơ cá nhân, đổi mật khẩu, đăng xuất. Đã bỏ nút đăng xuất riêng ngoài header. Dưới tên chỉ hiện vai trò chính (tên từ BE); trong menu vai trò chính đứng đầu và được tô đậm. Avatar hiện cả trên mobile.
- `/profile` (`my-profile-page.tsx`, `my-profile-sections.tsx`): xử lý trước `matchRoute` trong `workspace-page.tsx`, dữ liệu từ `GET /auth/me/profile`. Có thông tin Huynh Trưởng, tài khoản, lịch sử cấp độ, chứng nhận (thẻ/bảng, mở chi tiết qua `/auth/me/certificates`). Tài khoản không gắn Huynh Trưởng hiện trạng thái "Không có thông tin hồ sơ".
- `change-password-dialog.tsx` + `change-password-steps.tsx`: 3 bước mật khẩu hiện tại → OTP 6 ô (`otp-input.tsx`, dán cả mã, tự gửi khi đủ 6 số, đếm ngược hết hạn/gửi lại) → mật khẩu mới + xác nhận. Có thanh độ mạnh và gợi ý mật khẩu mạnh (`password-strength.ts`: chữ hoa, chữ thường, số, ký tự đặc biệt, từ 12 ký tự). Mọi kiểm tra chính nằm ở BE.
- Test: `tests/unit/modules/account/*`.

## Giữ bộ lọc, drawer chi tiết gom nhóm tiếng Việt (nhánh `feature/audit-fields-filters-drawer-vi`)

- `lib/use-session-state.ts`: `useSessionState` (nhớ giá trị theo phiên trình duyệt) và `readStoredQuery/writeStoredQuery`.
- `use-resource-query-state.ts`: bộ lọc/tìm kiếm/sắp xếp/phân trang của mọi danh sách được lưu theo `pathname|tab`. URL trần (menu, đóng modal, liên kết mở drawer không kèm bộ lọc) sẽ khôi phục bộ lọc đã lưu; bấm "Xóa bộ lọc" thì lưu trạng thái rỗng nên không khôi phục lại. Test: `tests/unit/components/common/use-resource-query-state.test.tsx`.
- Các bộ lọc ngoài danh sách tài nguyên cũng được nhớ: ô tìm kiếm chung của chi tiết khóa, lọc/tìm thông báo, tab + bộ lọc thống kê, tìm/lọc/sắp xếp thư viện cấu hình chứng nhận.
- `detail-section-types.ts` (kiểu section, `AUDIT_SECTION`) và `system-detail-sections.tsx`: drawer chi tiết tài khoản, vai trò, quyền, vai trò tài khoản, quyền của vai trò/tài khoản, thành phần điểm, nhật ký hệ thống gom nhóm bằng tiếng Việt, không hiển thị mã/UUID; người tạo/cập nhật/gán/thu hồi hiển thị bằng tên (`createdByName`, `updatedByName`, `assignedByName`, `revokedByName`, `approvedByName` do BE giải mã). Chỉ giữ mã chứng nhận (và mã viết tắt chứng chỉ của loại khóa).

## Chia đội khóa huấn luyện

- Tab `Chia đội` (`/training/teams`, route nhúng, chỉ khóa thường) trong chi tiết khóa: `modules/training-teams/*` (`CourseTeamsView`, `TeamDivideDialog`, `TeamOverviewPanel`, logic form ở `team-form.ts`, test `tests/unit/team-form.test.ts`). Danh sách dùng `/training/participants` thêm cột Đội, Giới tính; bộ lọc như danh sách tham dự + lọc theo đội (`optionsEndpoint` có `:courseCode` được `useFilterOptions` thay bằng khóa đang xem).
- Nút `Chia đội`/`Chia lại đội` mở modal cấu hình (số đội ↔ số hồ sơ mỗi đội tự tính, tên đội theo số thứ tự hoặc tự nhập, chia ngẫu nhiên hoặc tối đa N giáo hạt/giáo xứ mỗi đội), `Nhập excel chia đội` (mẫu có cột Tên đội), `Xóa chia đội`. Chỉ hiện với tài khoản có quyền duyệt đăng ký khi khóa chưa kết thúc và còn hoạt động.
- Cột Đội sửa được ngay trên bảng (`config.cellEditors` của `ResourceListRuntime`, ô `TeamNameCell` dùng `<datalist>` gồm đội đã lưu và tên đang nhập), bấm `Lưu đội` mới gọi `PATCH .../teams/assignments`. Xuất Excel dùng `config.exportEndpoint` = `/training/participants/teams`.

## Thẻ tham dự, điểm danh QR và email thông tin tham dự (nhánh `feature/attendee-badge-mail-merge`)

- Menu `Huấn luyện → Cấu hình thẻ tham dự` (`/training/badge-config`, kind `badge-config`, quyền `training.badge_config.*`): `modules/badges/*`. `BadgeConfigView` = thư viện (`BadgeLibrary`: tìm kiếm, lọc phạm vi / khổ giấy / mặt sau, phân trang phía BE) + trình thiết kế (`BadgeCardSettings`: preset khổ thẻ 90×55, CR80, 100×70, A7, A6, A5 hoặc nhập mm, hướng thẻ, khổ + hướng giấy, lề, khoảng cách, viền cắt, thẻ có mặt sau, hình minh họa số thẻ / trang; `BadgeEditor`: tab Mặt trước / Mặt sau, ảnh nền riêng từng mặt, thêm trường / văn bản / mã QR, kéo thả bằng `CertificateCanvas` dùng lại, `BadgeLayoutInspector`). Logic thuần nằm ở `badge-sheet.ts` (khớp `BadgeSheetLayout` của BE: số cột × hàng, vị trí thẻ, đối xứng mặt sau) và `badge-design.ts` (form, payload, kiểm tra như BE). Tên trường mail merge lấy từ `/badges/config/fields` (có tên đội).
- Tab `Thẻ & điểm danh` trong chi tiết khóa thường (`modules/course-participants/*`, dùng chung quyền xem danh sách tham dự): thẻ thống kê (đã điểm danh, đã gửi email, gửi lỗi, thiếu / sai email), bảng hồ sơ lọc phía server (đội, điểm danh, tình trạng email, tìm kiếm chung của chi tiết khóa), chọn nhiều hồ sơ. Nút: `Xuất thẻ` (`BadgeExportDialog`: chọn cấu hình, đội, hai mặt, cạnh lật; job nền rồi tải PDF), `Gửi email` (`InvitationDialog`: phạm vi, kèm QR chỉ khi khóa bật điểm danh, gửi lại; `InvitationResultDialog` nhóm hồ sơ lỗi theo lý do, tải CSV), `Quét QR điểm danh` (`AttendanceScannerDialog`: camera liên tục bằng jsqr + súng quét USB / dán mã / chọn ảnh, chống quét trùng bằng `scan-gate.ts`), điểm danh / bỏ điểm danh thủ công từng dòng. Bấm tên hồ sơ mở `ParticipantDetailDrawer` (điểm danh, email, người tạo / duyệt / điểm danh). Quét và điểm danh dùng quyền riêng `training.attendance.scan.*` (`course.canScan`, tách khỏi `canManage` = quyền duyệt dùng cho gửi email); nút quét nhanh ở header (`QuickAttendanceButton`) cũng chỉ hiện với quyền này.
- `AutoSendBanner` (đầu chi tiết khóa): khóa bật tự gửi email khi duyệt nhưng còn hồ sơ đã duyệt từ trước chưa được gửi thì hỏi gửi bù; hồ sơ đã gửi không bị gửi lại.
- Form khóa thường có mục `Điểm danh và thẻ tham dự` với hai công tắc `attendanceEnabled` / `autoSendInvitation`; thông tin khóa hiện hai cờ.
- Sửa `getFormSpec`: spec gắn module riêng (khóa quá khứ) không còn được dùng thay cho route của module khác cùng loại tài nguyên (trước đây form tạo / sửa khóa thường bị thay bằng form khóa quá khứ).
- Kiểm thử (vitest, thư mục `tests/unit`): `modules/badges/*` (hình học xếp thẻ, form, thư viện, trình soạn, `BadgeConfigView` với API giả), `modules/course-participants/*` (logic job / tóm tắt lỗi gửi / token / truy vấn, hub, hộp thoại, quét QR), `modules/training-courses/course-detail-attendance-tab.test.tsx`, `config/routes/badge-routes.test.ts`, `components/form/form-spec-registry.test.ts`.


## Ghi nhớ đăng nhập, quên mật khẩu, admin đặt lại mật khẩu (nhánh `feature/remember-me-forgot-reset-password`)

- `modules/auth/components/login-view.tsx`: checkbox "Ghi nhớ đăng nhập" nay nằm trong schema zod (`rememberMe`) và được gửi lên `POST /auth/login`; BE quyết định cookie phiên hay cookie lưu 30 ngày. "Quên mật khẩu?" là `Link` tới `/forgot-password`. Khung nền/thẻ giữa trang tách thành `auth-shell.tsx` dùng chung với màn quên mật khẩu.
- Quên mật khẩu: `app/(auth)/forgot-password/page.tsx` → `modules/auth/components/forgot-password-view.tsx` (3 bước tên đăng nhập → OTP → mật khẩu mới → xong), `forgot-password-steps.tsx` (bước tên đăng nhập và màn hoàn tất), `forgot-password-api.ts`. Tái dùng `OtpStep`, `NewPasswordStep`, `StepIndicator`, `FormError` của `modules/account/components/change-password-steps.tsx`; `NewPasswordStep` nhận `oldPassword` tùy chọn (bỏ quy tắc "khác mật khẩu hiện tại" khi quên mật khẩu) và `submitLabel`. Email hiển thị là chuỗi BE đã che (`ng***@g***.com`), FE không tự che. Mọi kiểm tra chính nằm ở BE.
- `src/proxy.ts`: thêm `forgot-password` vào danh sách đường dẫn không cần cookie phiên.
- Admin đặt lại mật khẩu: `ResourceAction` có thêm `resetPassword`; route `/system/accounts` khai báo `actions.resetPassword` với tiền tố quyền `system.account.reset_password.` (quyền riêng, không suy ra từ `system.account.manage.`). `resource-table.tsx` hiện nút khóa (icon Key) cho tài khoản đang hoạt động, không phải chính mình, không phải SUPER_ADMIN; bấm mở `ConfirmActionDialog` (gõ "Xác nhận") trong `resource-list-runtime.tsx` rồi `POST /system/accounts/{username}/reset-password` (`apiMutationOnce`). Toast hiển thị email đã che và hạn 10 phút; mật khẩu tạm không bao giờ về FE. Nhãn quyền `reset_password` = "Đặt lại mật khẩu" trong `permission-taxonomy-labels.ts`.
- Đăng nhập bằng mật khẩu tạm vẫn dùng cơ chế `mustChangePassword` hiện có (chuyển `/change-password`). Mật khẩu tạm quá 10 phút: BE trả lỗi, người dùng dùng Quên mật khẩu hoặc nhờ admin đặt lại.
- Test: `tests/unit/modules/auth/login-view.test.tsx`, `forgot-password-view.test.tsx`, `tests/unit/components/common/resource/account-reset-password-action.test.tsx`, `tests/unit/proxy.test.ts`.

## Sao chép danh sách tham dự từ khóa tiên quyết (nhánh `feature/copy-prerequisite-attendees`)

- Module `src/modules/prerequisite-copy`: `types.ts`, `candidate-filter.ts` (lọc giáo hạt / giáo xứ / kết quả / tìm không dấu, danh sách giáo xứ phụ thuộc giáo hạt, `idsToCopy`), `components/prerequisite-copy-dialog.tsx` (dialog chính), `source-course-picker.tsx` (chọn nhiều khóa nguồn), `candidate-filter-bar.tsx`, `candidate-table.tsx` (tick bỏ chọn, chọn tất cả theo bộ lọc, hồ sơ bị chặn hiển thị mờ).
- Nút "Sao chép từ khóa tiên quyết" nằm trên thanh công cụ tab Danh sách tham dự (`course-detail-page.tsx` truyền `toolbarActions`) khi người dùng có quyền duyệt đăng ký, khóa thường còn bật và chưa kết thúc; nút tự ẩn khi BE trả `available=false` hoặc không có khóa tiên quyết đã kết thúc.
- Dialog: mặc định chọn tất cả khóa nguồn, option "Chỉ hồ sơ có kết quả đạt" (mặc định) / "Bao gồm cả hồ sơ có kết quả không đạt" (hiện thêm bộ lọc Kết quả). Mọi hồ sơ sao chép được mặc định được tick; chỉ hồ sơ đang hiển thị theo bộ lọc và được tick mới được gửi lên. Sau khi sao chép làm mới `["resource"]`.
- Test: `tests/unit/modules/prerequisite-copy/candidate-filter.test.ts`.

## Khóa dành cho giáo hạt, gửi liên giáo hạt, ghi chú hồ sơ (nhánh `feature/copy-prerequisite-attendees`)

- **Khóa giáo phận dành cho giáo hạt**: form khóa (`modules/training-courses/form-specs.ts`) có trường multiselect "Khóa dành cho giáo hạt" (section "Đợt của khóa"), chỉ hiện cho tài khoản quản lý cấp giáo phận và khóa không phải khóa giáo hạt; payload gửi `targetDeaneryIds` (kể cả rỗng khi sửa). Trang chi tiết khóa hiện dòng "Dành cho giáo hạt" khi có.
- **Gửi ngoài đợt**: `registration-list-field.tsx` gắn nhãn "Ngoài đợt" (`offTarget` từ `registration-candidates`) ở bảng ứng viên và danh sách đã chọn, mỗi hồ sơ có ô Ghi chú (tùy chọn). `ResourceFormSpec.offTarget` (`collect` / `apply`) cho form đăng ký (`modules/training-workflow/form-specs.ts`): bấm Gửi mà có hồ sơ ngoài đợt thì `resource-form-page.tsx` mở `OffTargetConfirmDialog` (`modules/training-workflow/components/`), bắt nhập lí do riêng từng hồ sơ rồi mới gửi (`offTargetReasonsByLeaderId`, `notesByLeaderId`). Hàm thuần ở `modules/training-workflow/off-target.ts`.
- **Ghi chú**: cột `registrationNote` ở Đăng ký tham dự, Duyệt đăng ký, Danh sách tham dự; `RegistrationNoteCell` sửa tại chỗ (lưu khi rời ô / Enter) qua `PATCH /training/participations/{id}/registration-note` cho người duyệt hoặc người gửi hồ sơ chờ duyệt; khóa kết thúc / vô hiệu hóa chỉ xem. Cột `review` đổi nhãn thành "Ghi chú duyệt". `ResourceCell` gắn nhãn "Ngoài đợt" / "Liên giáo hạt" cạnh tên huynh trưởng; drawer và hộp thoại duyệt hiện lí do ngoài đợt / liên giáo hạt.
- **Liên giáo hạt**: route `/training/cross-deanery` (kind `cross-deanery`, nhóm Quy trình huấn luyện) → `modules/cross-deanery/`: `CrossDeaneryView` (tab Yêu cầu / Gửi hồ sơ), `SendPanel` (chọn khóa của giáo hạt khác, chọn huynh trưởng, lí do từng hồ sơ + lí do ngoại lệ nếu chưa đủ điều kiện), `RequestList` + `DecisionDialog` (giáo hạt nhà đồng ý / từ chối / đồng ý một phần, giáo xứ thu hồi). Nhãn quyền `cross_approve` thêm ở `permission-taxonomy-labels.ts`.
- Test: `tests/unit/modules/cross-deanery/send-form.test.ts`, `tests/unit/modules/training-workflow/off-target.test.ts`.

## 2026-10-26 Responsive tablet/mobile + quét QR hợp nhất (nhánh `feature/responsive-unified-qr-scan`)

- Quy ước thiết bị: dưới 1024px (tablet dọc, điện thoại) bảng dữ liệu chuyển sang dạng thẻ (`components/common/resource/resource-card-list.tsx`, hook `lib/use-media-query.ts`): 1 cột trên điện thoại, 2 cột trên tablet; thao tác vùng chạm 44px; ô nhập điểm/chọn nhiều giữ nguyên. Từ 1024px giữ bảng. Danh sách có `cardView` (khóa, chứng nhận, huynh trưởng) luôn xem thẻ dưới 1024px và ẩn công tắc Bảng/Thẻ. Trình quét là sheet toàn màn hình trên điện thoại. Mọi thiết bị đều có nút quét QR ở header.
- Quét QR hợp nhất: `modules/qr-scan/` (`HeaderScanButton`, `use-qr-camera`, `scan-payload`). Nút header mở `AttendanceScannerDialog` không có `courseCode`: mã điểm danh `HTATT2.<mã khóa>.<mã hồ sơ>.<chữ ký>` gọi `/training/attendance/{lookup,scan}` (không chọn khóa, BE báo khóa chưa bật điểm danh / đã kết thúc / bị vô hiệu hóa); mã chứng nhận gọi `GET /certificates/{mã}` trước: không có thì báo lỗi tại chỗ, có (kể cả đã thu hồi) thì chuyển tới trang chi tiết. Mã điểm danh cũ `HTATT1` bị từ chối kèm hướng dẫn xuất lại thẻ / gửi lại email. Nút hiện khi có quyền quét điểm danh hoặc xem chứng nhận. Đã bỏ `QuickAttendanceButton` và `open-courses.ts`.

## 2026-10-27 Tạo tài khoản vai trò toàn hệ thống và đổi email hồ sơ (nhánh `feature/superadmin-create-accounts`)

- `modules/accounts/form-specs.ts`: form tạo tài khoản của SUPER_ADMIN lấy vai trò từ `/system/roles`, loại ADMIN_DEANERY / ADMIN_PARISH; `credentialEmail` bắt buộc với mọi vai trò; `dioceseId` chỉ gửi cho ADMIN_DIOCESE.
- `super-admin-route-overrides.ts`: bộ lọc vai trò của danh sách tài khoản dùng `/system/roles`.
- Chi tiết tài khoản hiện dòng Email khi BE trả (chỉ SUPER_ADMIN).
- Hồ sơ cá nhân: tài khoản không gắn Huynh Trưởng có nút Đổi/Thêm email (`ChangeEmailDialog`, `PUT /auth/me/email`, nhập mật khẩu hiện tại).

## 2026-10-28 Bảng chấm điểm vừa khung (nhánh `fix/scoring-table-columns`)

- `resource-table.tsx`: khi có `scoreEntry` (tab Chấm điểm) bảng bỏ `min-w-270`, bỏ cắt chữ một dòng ở cột Huynh trưởng và các cột chữ (cho xuống dòng), thu `px-3` → `px-2`, cột Huynh trưởng `min-w-40`, cột điểm `min-w-24` với tiêu đề thành phần cho xuống dòng. Mọi cột giữ nguyên; ở 1440px bảng vừa khung, không cần cuộn ngang.
- Tạo giáo xứ: BE nay cho Admin giáo phận (có quyền `organization.parish.create.diocese`) tạo giáo xứ trong giáo hạt của giáo phận mình, nên nút "Thêm giáo xứ" khớp với quyền; không cần đổi FE.

## 2026-10-28 Giáo họ / giáo điểm (nhánh `feature/parish-sub-units`)

- BE lưu giáo họ (`GIAO_HO`) và giáo điểm (`GIAO_DIEM`) cùng bảng `parish` (`unitType`, `parentParishId`), nên mọi nơi hiển thị `parishName` của huynh trưởng / hồ sơ / chứng nhận / thẻ tự ra đúng tên giáo họ. FE chỉ đổi nhãn cột "Giáo xứ" thành "Giáo xứ / giáo họ / giáo điểm" ở các bảng, drawer, bộ lọc và form liên quan.
- Màn `/organization/parishes` đổi tên "Giáo xứ, giáo họ, giáo điểm": form có ô **Loại đơn vị** (không sửa được khi chỉnh sửa) và **Thuộc giáo xứ** (chỉ hiện với giáo họ / giáo điểm, liệt kê giáo xứ cùng giáo hạt qua `/parishes?filters={"deanery.id","unitType":"PARISH"}`); danh sách thêm cột Loại, Thuộc giáo xứ (bỏ cột SĐT, email, tuyên úy để đủ chỗ; xem ở chi tiết / Excel), bộ lọc Loại đơn vị; chi tiết có thêm số giáo họ / giáo điểm.
- Ô chọn giáo xứ của huynh trưởng (`leaders/form-specs.ts`, `leader-detail-page.tsx`) hiển thị "Giáo họ B - Giáo xứ X" nhờ `optionLabelFields: ["name", "parentParishName"]`.
- Không tái sinh `schema.d.ts` / `openapi` trong nhánh này (bản commit đã cũ so với BE, tái sinh sẽ kéo theo diff rất lớn không liên quan).

## 2026-10-28 Trạng thái chứng nhận chờ duyệt ở trang chi tiết (nhánh `fix/certificate-pending-status`)

- Chứng nhận `PENDING` / `SUBMITTED` ẩn nhóm "Thông tin chứng nhận" (nhóm duy nhất chứa ô Trạng thái) và bản xem trước, nên trước đây trang chi tiết và drawer không hiện trạng thái nào. `certificate-detail-drawer.tsx` thêm khối `WaitingNotice` ở đầu nội dung (badge trạng thái, giải thích vì sao chưa có bản xem trước, mã chứng nhận), dùng chung cho trang chi tiết và drawer.
## 2026-10-28 Tìm kiếm nhanh ở header (nhánh `feature/header-quick-search`)

- Module mới `src/modules/search/`: `components/quick-search.tsx` (ô nhập ở header từ `md`, dropdown Radix Popover, Ctrl/⌘+K để focus), `components/quick-search-mobile.tsx` (nút kính lúp + hộp thoại dưới `md`), `components/quick-search-results.tsx` (kết quả gom nhóm), `hooks/use-quick-search.ts` (gọi `GET /search/quick?q=&limit=5`), `hooks/use-quick-search-nav.ts` (↑ ↓ Enter Esc), `lib/result-link.ts` (kết quả → đường dẫn).
- Debounce dùng chung `useDebouncedValue` (400ms) như các ô tìm kiếm khác; chỉ gọi API khi từ khóa từ 2 ký tự trở lên.
- Phân quyền do BE quyết định: BE chỉ trả nhóm mà tài khoản có quyền đọc, trong phạm vi của tài khoản, nên FE không tự lọc nhóm. Tài khoản `unitLocked` không thấy ô tìm kiếm.
- Link kết quả: huynh trưởng `/leaders/profiles/:id`, khóa `/training/courses/:courseCode`, chứng chỉ `/certificates/:code`; giáo phận / giáo hạt / giáo xứ mở danh sách với `?detail=:id`.
- Test: `tests/unit/modules/search/`.

## 2026-10-29 Điểm danh theo thời gian khóa, hiển thị bảng gọn, quyền sửa huynh trưởng (nhánh `feature/attendance-window-and-table-display`)

- Tab `Thẻ & điểm danh`: nút `Quét QR điểm danh` và nút điểm danh thủ công chỉ hiện trong thời gian diễn ra khóa và khi chưa khóa chỉnh sửa điểm. `CourseInfo.attendanceClosedReason` (tính ở `course-detail-page.tsx` bằng `attendanceClosedReason`, dựa `isCourseWithinDates` + `scoreLocked`) là lý do chưa mở; hub hiện nó thành `Callout` thay cho nút. Nút quét ở header vẫn hiện, BE trả lỗi rõ ràng (khóa chưa diễn ra / khóa chỉnh sửa điểm) và `AttendanceScannerDialog` hiển thị đúng thông báo.
- Hiển thị bảng (`components/common/resource/resource-format.tsx`, `ResourceCell`): trong các tab của khóa (có `EmbeddedResourceProvider`) và danh sách huynh trưởng (prop `fullNames`, truyền từ `resource-table.tsx` / `resource-card-list.tsx` khi `route.kind === "leaders"`), tên thánh + họ tên và giáo xứ / giáo hạt hiển thị đầy đủ, không cắt "...". Tên đơn vị bỏ tiền tố bằng `shortUnitName` (`lib/unit-name.ts`: "Giáo xứ Lái Thiêu" → "Lái Thiêu", áp dụng cho giáo xứ / hạt / họ / điểm); cột `parishId` / `deaneryId` hiển thị theo `parishName` / `deaneryName` của dòng. Bảng điểm danh (`participants-table.tsx`) cũng dùng `shortUnitName`; `LeaderIdentity` cho tên xuống dòng thay vì `truncate`.
- Cột ghi chú (`registrationNote`, `scoreNote`, `exceptionReason`, `approvalReason`, `offTargetReason`, `crossDeaneryReason`, `review`): vẫn một dòng có "..." nhưng rê chuột / focus hiện tooltip đủ nội dung (`NoteValue`, Radix Tooltip có `Provider` riêng). `RegistrationNoteCell` dùng `NoteValue` khi chỉ xem và bọc ô nhập bằng `Tip` khi sửa được.
- Nút `Sửa` của danh sách huynh trưởng (`config/routes/groups/leader.ts`) hiện cho `ADMIN_DIOCESE` / `ADMIN_DEANERY` / `ADMIN_PARISH` có quyền `organization.leader.update.*` tương ứng; quyền diocese / deanery do super admin cấp (BE migration `V113`).
- Test: `tests/unit/lib/unit-name.test.ts`, `tests/unit/components/common/resource-cell-course-tab.test.tsx`, `course-detail-attendance-tab.test.tsx` (chưa diễn ra, khóa điểm), `config/routes/leader-routes.test.ts`.

## 2026-10-29 Ảnh đại diện cho tài khoản không gắn huynh trưởng

- Trang `/profile` của tài khoản không gắn huynh trưởng có nút `Thêm / Đổi ảnh đại diện`: mở `AvatarUploadDialog` với `category="ACCOUNT_AVATAR"` (khung 4x6 như ảnh huynh trưởng), tải ảnh lên `/media` rồi gọi `avatarApi.update` (`PUT /auth/me/avatar`), sau đó làm mới `myProfileQueryKey`. Tài khoản gắn huynh trưởng vẫn đổi ảnh trong `EditProfileDialog`. `MyProfile` có thêm `imageUrl` / `imageThumbUrl` / `imageAssetId`; menu tài khoản dùng ảnh huynh trưởng, nếu không có thì ảnh tài khoản. Test: `tests/unit/modules/account/account-avatar.test.tsx`.

## 2026-10-29 Ảnh đại diện khi import Excel (nhánh `feature/excel-import-avatar`)

- Import hồ sơ huynh trưởng và danh sách tham dự khóa quá khứ có thêm ô chọn **file ZIP ảnh** (tùy chọn, prop `allowAvatarZip` của `ExcelImportDialog`) và cột Excel **Tên file ảnh** (không bắt buộc). Dòng không ghi tên file ảnh vẫn được import, chỉ chưa có ảnh; huynh trưởng đã có ảnh thì BE giữ ảnh cũ.
- Xử lý ảnh trên trình duyệt trước khi gửi: `lib/media/prepare-avatar-zip.ts` (fflate) giải nén tuần tự từng ảnh, `lib/media/face-crop.ts` dò mặt bằng MediaPipe FaceDetector rồi `computeFaceCrop` cắt khung 2:3 quanh khuôn mặt (tâm mặt ~38% chiều cao, mặt ~40% khung), xuất JPEG 480x720 (chất lượng 0.85), đóng lại thành ZIP mới và **giữ nguyên tên entry** để khớp cột Excel. Model `blaze_face_short_range.tflite` và wasm tự host ở `public/mediapipe/` (nạp lười khi chọn ZIP; trình duyệt chỉ tải một bản wasm ~14MB). Không dò được mặt / model lỗi thì cắt giữa lệch lên trên và đánh dấu cần kiểm tra.
- Bước xem trước trong dialog: `avatar-zip-preview.tsx` (lưới ảnh đã cắt, nhãn không thấy mặt / nhiều người / mặt nhỏ / không đọc được, lọc "chỉ hiện ảnh cần xem lại", bỏ / khôi phục từng ảnh) và `avatar-crop-dialog.tsx` (chỉnh tay trên ảnh gốc trong ZIP bằng khung kéo / zoom). Logic khung dùng chung với `AvatarUploadDialog` nằm ở `lib/media/avatar-frame.ts`. Hướng dẫn "người ở giữa ảnh, nhìn thẳng, rõ mặt, một người một ảnh" nằm ngay dưới ô chọn ZIP.
- API: `createExcelImportJob(path, file, key, images?)` gửi thêm part `images`. `ExcelJob` có `avatarStatus` (PENDING / RUNNING / DONE), `avatarProcessed`, `avatarTotal`, `avatarSucceeded`, `avatarWarnings[{row, fullName, fileName, reason}]`. Dữ liệu Excel lưu trước, ảnh gắn sau nên khay tác vụ (`excel-jobs-tray.tsx`) tiếp tục poll tới khi ảnh DONE (`needsPolling` ở `excel-jobs-store.ts`), báo "Đã gắn ảnh a/b" và liệt kê hồ sơ lỗi ảnh ở `avatar-warnings-list.tsx` (có nút sao chép).
- Giới hạn: ZIP gốc ≤ 300MB, ≤ 5000 ảnh; ZIP gửi lên ≤ 50MB (khoảng 1000+ ảnh sau khi cắt).
- ESLint bỏ qua `public/mediapipe/**`. Không tái sinh `schema.d.ts` (kiểu `ExcelJob` viết tay trong `lib/api/client.ts`).
- Test: `tests/unit/lib/media/face-crop.test.ts`, `prepare-avatar-zip.test.ts`, `components/common/resource/excel-import-dialog.test.tsx`.
- Hộp chọn ảnh đại diện (`AvatarUploadDialog`, dùng khi tạo và sửa huynh trưởng, hồ sơ cá nhân, tài khoản) tự nhận diện khuôn mặt: sau khi ảnh nạp, `lib/media/face-frame.ts` (`suggestFaceFrame` -> `frameFromCrop`) đổi vùng cắt quanh mặt của `computeFaceCrop` thành zoom / vị trí trong khung 4x6. Có thông báo kết quả (`FACE_NOTES`: đã căn / không thấy mặt / nhiều người / mặt nhỏ / chưa nhận diện được) và nút "Căn theo khuôn mặt" để căn lại. Kéo hoặc phóng to trong lúc đang dò sẽ hủy kết quả dò (`detectRun`). Dùng chung `lib/media/avatar-frame.ts`. Dòng log "INFO: Created TensorFlow Lite..." của MediaPipe (in bằng `console.error`) được lọc trong `face-crop.ts` để không hiện thành lỗi giả.
- Lưới xem trước ZIP cao tối đa 26rem để không cắt hàng nút Chỉnh / Bỏ.
- Test thêm: `tests/unit/lib/media/face-frame.test.ts`, `face-crop-log.test.ts`, `tests/unit/components/common/avatar-face-align.test.tsx`, `resource/excel-import-avatar-flow.test.tsx` (chọn Excel + ZIP, xem trước, bỏ ảnh, gửi ZIP đã xử lý, idempotency).

## Refactor SOLID / design pattern (nhánh `refactor/solid-design-patterns`, 2026-10-30)

- Không đổi giao diện hay hành vi; chỉ tách trách nhiệm và gom code lặp.
- `lib/auth/permissions.ts`: thêm `hasRole`, `isHiddenForSuperAdmin`, `canReadRoute` (thay các bản sao ở `workspace-page`, `app-shell`, `resource-table`, `accounts/form-specs`).
- `modules/workspace/view-resolution.ts`: bảng phân giải màn hình theo kiểu route + `kind` (`resolveWorkspaceView`) và theo tiền tố module (`resolveResourceModule`); `workspace-page.tsx` và `module-resource-renderer.tsx` chỉ còn tra bảng. Thêm màn mới = thêm khóa + một dòng render.
- `lib/api/query-keys.ts` (`resourceKey`, `resourceListKey`) thay các chuỗi `["resource", ...]`; `lib/api/filters.ts` (`filtersParam`, `withFilters`) thay `encodeURIComponent(JSON.stringify(...))`.
- `components/common/resource/resource-action-requests.ts`: bảng `REQUEST_BUILDERS` dựng request cho từng thao tác dòng (toggle, duyệt, từ chối, thu hồi, cấp lại, rút đăng ký, xóa, thu hồi quyền, đặt lại mật khẩu) và `actionSuccessMessage`; `resource-list-runtime.tsx` không còn chuỗi `if (action === ...)`.
- `lib/jobs/job-runner.ts` (chuyển từ `modules/course-participants`), `lib/jobs/pdf-export-job.ts` (`runPdfExportJob`, dùng lại `downloadFile` + `pollUntilDone`), `lib/jobs/excel-jobs-client.ts` (kiểu và hàm Excel job tách khỏi `lib/api/client.ts`), `lib/api/idempotency.ts` (`newIdempotencyKey`).
- Test thêm: `tests/unit/lib/auth/route-access.test.ts`, `modules/workspace/view-resolution.test.ts`, `lib/api/query-keys-and-filters.test.ts`, `lib/pdf-export-job.test.ts`, `components/common/resource-action-requests.test.ts`.
- `components/common/resource/resource-row-permissions.ts`: bảng `ROW_RULES` theo `kind` cho quyền sửa/bật-tắt dòng (thay thang `route.kind ===` trong `resource-table.tsx`).
- `components/common/resource/detail-kind-sections.tsx` (`DETAIL_SECTIONS_BY_KIND`) và `detail-field-rules.ts` (nhãn, quy tắc ẩn trường theo loại): `detail-drawer.tsx` chỉ còn dựng khung. `rankHistorySentence` dùng chung ở `modules/leaders/components/leader-detail-utils.ts`.
- `components/form/resource-form/form-controls.tsx`: `CONTROL_RENDERERS` theo `type` thay chuỗi `if (type === ...)`.
- `modules/layout-config/use-config-library.ts` (`useConfigLibrary`, `configLibraryApi`, `resolveConfigId`): dữ liệu dùng chung của `certificate-config-view` và `badge-config-view`.
- Test thêm: `resource-row-permissions`, `detail-field-rules`, `form-controls-registry`, `layout-config/use-config-library`. `next build` chạy thành công.
- `leader-detail-page.tsx` (853 -> 365 dòng) tách thành `leader-edit.ts` (giá trị sửa, kiểm tra, payload), `leader-detail-ui.tsx` (thẻ, trường, huy hiệu) và `leader-detail-tabs.tsx` (các tab khóa học, chứng nhận, tài khoản, lịch sử cấp bậc); test `tests/unit/modules/leaders/leader-edit.test.ts`.
- `modules/layout-config/form-controls.tsx` (chuyển từ `badges/components`, thêm `FilterSelect`) dùng chung cho màn cấu hình thẻ và chứng nhận; `certificates/certificate-library-params.ts` giữ tham số lọc/sắp xếp thư viện (`certificate-config-view.tsx` 1046 → 920 dòng). Field của màn chứng nhận nay dùng bản có `htmlFor` (nhãn gắn đúng ô nhập).
- `certificates/certificate-layout-items.ts` (`fieldItem`, `textItem`, `qrItem`, `photoItem`): phần tử bố cục mặc định, thay 4 literal trong `certificate-config-view.tsx`; test `certificate-layout-items.test.ts`. `next build` thành công.
- `certificate-config-view.tsx` (1046 -> ~340 dòng) tách thành `certificate-library-panel.tsx`, `certificate-designer-panel.tsx`, `certificate-action-bar.tsx` cùng hook `use-certificate-library-state.ts` (tìm kiếm/lọc/sắp xếp/trang) và `layout-config/use-undo-redo-shortcuts.ts` (phím tắt hoàn tác dùng chung với `badge-config-view`).
- `lib/api/client.ts`: `apiMutation` chỉ gọi API và ném lỗi, không toast nữa; `lib/api/mutation-cache.ts` (`createMutationCache`, gắn ở `AppProviders`) toast lỗi cho mọi mutation không tự khai báo `onError` — bỏ toast đôi ở các mutation đã có `onError`.
- Đã thử trên ứng dụng chạy local (đăng nhập bằng tài khoản kiểm thử): tổng quan, giáo phận (danh sách + drawer), huynh trưởng (chi tiết + 4 tab), cấu hình chứng nhận (lọc, thêm văn bản, hoàn tác), cấu hình thẻ, khóa huấn luyện (chi tiết + đăng ký + drawer hồ sơ). Không lưu dữ liệu.

## Ảnh đại diện kèm Excel danh sách tham dự khóa thường (2026-10-30)

- `resource-list-runtime.tsx`: `ExcelImportDialog` của tab danh sách tham dự luôn bật `allowAvatarZip` (trước đây chỉ khóa quá khứ); mô tả và gợi ý của khóa thường nhắc ảnh tùy chọn và cột "Tên file ảnh". Ô chọn ZIP, tạo ZIP đã căn mặt và gửi `images` dùng lại luồng có sẵn của hồ sơ huynh trưởng / khóa quá khứ.
- `course-teams-view.tsx`: `ExcelImportDialog` của chia đội bật `allowAvatarZip` (mô tả và gợi ý nhắc cột "Tên file ảnh").

## Chính sách bảo vệ dữ liệu cá nhân và ô đồng ý (2026-11-04, nhánh `feature/privacy-policy-consent`)

- Kết quả rà soát bằng công cụ `mhfed/vn-law-check` (Luật 91/2025/QH15, NĐ 356/2025/NĐ-CP): hệ thống chưa có chính sách và chưa xin đồng ý ở đâu.
- Trang công khai `/chinh-sach-bao-mat` (`src/app/chinh-sach-bao-mat/page.tsx`, nội dung ở `modules/privacy/components/policy-sections.tsx`); `proxy.ts` loại đường dẫn này khỏi kiểm tra cookie phiên. Link ở `auth-shell.tsx` và menu tài khoản.
- Thông tin pháp nhân và phiên bản chính sách nằm ở `modules/privacy/constants.ts` (các mục `[ĐIỀN: ...]`). `PRIVACY_POLICY_VERSION` phải khớp `app.privacy.policy-version` của BE.
- `components/common/consent-checkbox.tsx`: ô đồng ý không tích sẵn, hai biến thể `self` (người dùng tự đồng ý) và `attestation` (quản trị viên xác nhận người có dữ liệu đã đồng ý khi nhập hộ).
- Cổng đồng ý sau đăng nhập `PrivacyConsentGate` gắn trong `AuthGate`: chưa đồng ý bản chính sách hiện hành thì chặn bằng hộp thoại (nút Đăng xuất). Mục "Quyền riêng tư" trong hồ sơ cá nhân xem trạng thái và rút đồng ý (rút xong đăng xuất).
- Ô đồng ý (self): sửa hồ sơ, đổi email, ảnh đại diện tài khoản (`AvatarUploadDialog requireConsent`); gửi `privacyConsent: true`.
- Ô xác nhận (attestation): engine form có cờ `consentAttestation` ở `ResourceFormSpec` (bật cho huynh trưởng, tài khoản, giáo phận, giáo hạt, giáo xứ; gửi `subjectConsentConfirmed: true`); `ExcelImportDialog` luôn có ô này và gửi multipart `subjectConsentConfirmed` (huynh trưởng, người tham dự khóa, chia đội).
- Test: `consent-checkbox.test.tsx`, `privacy-consent-gate.test.tsx`; cập nhật test hộp thoại import, sửa hồ sơ, `excel-jobs-client`, `proxy`.

## Email huynh trưởng tùy chọn, cờ mở đăng ký, hiển thị điểm khóa quá khứ, sao chép danh sách tham dự (nhánh `feat/course-registration-copy-optional-email`)

- Form tạo/sửa huynh trưởng và trang chi tiết huynh trưởng không còn bắt buộc Email; để trống khi sửa gửi `clearFields: ["email"]`.
- Form khóa thường: công tắc `registrationEnabled` ("Mở đăng ký"); tắt thì ẩn và không gửi thời gian đăng ký. Trạng thái FE `DISABLED` ("Không mở đăng ký") suy ra từ `registrationEnabled === false` (BE lưu `CLOSED`); nút đóng/mở đăng ký bị vô hiệu cho trạng thái này.
- Form khóa quá khứ có công tắc `scoreVisible` như khóa thường.
- Field mới `course-copy` (`course-copy-sources-field.tsx`) trong form tạo/sửa khóa thường (cần quyền `training.participation.approve.*`, khóa chưa kết thúc): chọn nhiều khóa nguồn (tên đầy đủ xuống dòng, năm tổ chức, loại khóa/khóa quá khứ, số hồ sơ/đạt), chế độ `ALL` hoặc `PASSED_ONLY`; sao chép chạy khi lưu khóa, toast báo số hồ sơ đã sao chép/bỏ qua.
- Test: `tests/unit/modules/training-courses/course-copy-form.test.tsx`, cập nhật `leader-edit.test.ts`, `registration-state.test.ts`.

## Chứng nhận ngoại lệ (tab chấm điểm / duyệt chứng nhận)

- Tab chấm điểm: nút `ExceptionCertificateAction` (`exception-certificate-action.tsx`) ở hồ sơ đã chấm điểm nhưng không đạt, khóa thường có cấp độ đạt được và chưa kết thúc; gọi `POST /training/participations/{id}/exception-certificate`.
- Tab duyệt chứng nhận: hàng có `exceptionRequested` được tô nổi kèm nhãn "Chứng nhận ngoại lệ"; `ApprovalDialog` có prop `requireApproveReason` bắt buộc nhập lý do khi duyệt (một hoặc hàng loạt).
- Test: `tests/unit/components/exception-certificate.test.ts`.


## Modal lập danh sách / ngoại lệ: cột năm đạt cấp độ (feat/registration-achieved-year)

- `RegistrationCandidateModal` (`registration-list-field.tsx`) thêm cột "Năm đạt cấp độ" (`levelAchievedYear` từ BE, trống hiện "—"), mở rộng modal (`max-w-[1500px]`, bảng `min-w-[1240px]`), thêm `px-3` cho ô và giảm chữ tiêu đề cột còn `text-[11px]`.
## Khóa tiên quyết liên cấp (nhánh feat/cross-level-prerequisite)

- Ô khóa tiên quyết của loại khóa là `prerequisite-type-field.tsx` (type `prerequisite-type`): thẻ tóm tắt + hộp thoại tìm, lọc theo cấp, nhóm theo cấp, nhãn "Dùng chung" / "Giáo hạt tự tạo"; dữ liệu từ `/training/course-types/prerequisite-options`.
- Danh sách loại khóa có cột / bộ lọc "Nguồn tạo"; nút Sửa và Đổi trạng thái ẩn khi BE trả `editable: false` (`resource-row-permissions.ts`).
- Test: `prerequisite-type-field.test.tsx`, `course-type-owner.test.ts`.

## Bỏ trống cấp độ khi hoàn thành, quy tắc đạt khóa tiên quyết (nhánh fix/course-type-level-clear-prerequisite-rule)

- Form loại khóa: ô "Cấp độ khi hoàn thành" có lựa chọn trống mang nhãn "Bỏ trống (không thăng cấp)" (`emptyOptionLabel` trong `FormFieldSpec`). Khi sửa mà để trống, `mapSubmit` gửi `clearResultingLevel: true`; trước đây giá trị rỗng bị `compactPayload` bỏ đi nên BE giữ cấp độ cũ. "Tuổi tối thiểu" có `min: 0`, nhập 0 để bỏ yêu cầu tuổi (BE lưu thành trống). Cả ba ô điều kiện có dòng trợ giúp nói rõ cách bỏ trống.
- Dòng trợ giúp và hộp thoại chọn khóa tiên quyết ghi quy tắc đạt: loại có cấp chứng nhận tính theo chứng nhận được duyệt, loại không cấp chứng nhận tính theo kết quả khóa (`PASS_RULE_TEXT`).
- `TabStatChips`: nhãn "Tổng số hồ sơ" dùng lại tổng số tab đã tải (`total`), các nhãn có bộ lọc chỉ xin 1 dòng (`statChipCountUrl`, `size: 1` được thêm vào `BaseSearchParams`).
- Hàm bỏ dấu để tìm kiếm gom về `src/lib/search-text.ts` (`normalizeSearchText`), dùng ở ô chọn của form, ô chọn khóa tiên quyết và bộ lọc sao chép từ khóa tiên quyết.
- Test: `prerequisite-type-field.test.tsx` (payload), `tab-stat-chips.test.tsx`, `search-text.test.ts`.
- Sửa khóa cấp giáo phận: ô "Loại khóa" chỉ liệt kê loại cấp giáo phận (`courseTypesForDioceseCourse` ở `buildOptionsEndpoint`, dùng `managementUnitType` của khóa đang sửa), khớp BE từ chối loại giáo hạt cho khóa giáo phận.
- Khóa đã kết thúc (kết thúc thủ công hoặc quá ngày kết thúc, `isCourseEnded` trong `registration-state.ts`) ẩn nút Sửa ở danh sách (`resource-row-permissions.ts`) và trang chi tiết; BE cũng chặn.
- Test: `registration-state.test.ts`, `course-type-options.test.ts`.

## fix/account-roles-role-name
- Màn hình "Gán vai trò" (`/system/account-roles`, `src/config/routes/groups/system.ts`): cột hiển thị tên vai trò (`roleName`, nhãn "Vai trò") thay cho mã vai trò (`roleCode`, "Mã vai trò"). BE đã trả sẵn `roleName` trong `AccountRoleResponse`; bộ lọc "Vai trò" vốn đã chọn theo tên.
- Test `login-view.test.tsx` ("does not remember the login unless the box is ticked") đang lỗi sẵn trên `main`, không liên quan thay đổi này.
