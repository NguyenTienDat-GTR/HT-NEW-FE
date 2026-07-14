# HT Management FE Agent Log

## Preflight rule

- Before each implementation or test task, reread the full DOCX guide paragraphs and tables, `D:\quan-li-ht-new\BE\project.md`, and this file.
- For UI tasks, reread `D:\quan-li-ht-new\FE\DESIGN.md`.
- FE changes, architecture, routes, components, auth client, permission UI, data flow, design tokens, animation, responsive behavior, FE tests, done items, and FE remaining work are recorded here.
- BE changes are recorded only in `D:\quan-li-ht-new\BE\project.md`.

## FE architecture

- Next.js App Router with TypeScript strict and Tailwind CSS v4 scaffolded in `D:\quan-li-ht-new\FE`.
- Runtime dependencies installed: Radix/shadcn-style primitives, Phosphor Icons, TanStack Query/Table, React Hook Form, Zod, Zustand, openapi-fetch, StompJS, Recharts, Motion, date-fns/date-fns-tz, Sonner.
- Test/codegen dependencies installed: Vitest, Testing Library, MSW, Playwright, axe, openapi-typescript.
- `next.config.ts` enables `typedRoutes`, `output: "standalone"`, and rewrites `/backend/api/:path*` to `${BACKEND_ORIGIN}/api/:path*`.
- `.env.example` documents `BACKEND_ORIGIN`, `NEXT_PUBLIC_WS_URL`, `E2E_USERNAME`, and `E2E_PASSWORD` with no secrets.

## Routes and data flow

- `/login` and `/change-password` render dedicated auth forms with React Hook Form and Zod.
- `/dashboard`, `/analytics`, `/notifications`, organization, training, certificate, and system routes render through the App Router workspace catch-all and route registry.
- Auth state uses Zustand memory only. Refresh and protected calls use `credentials: "include"`, Bearer access token, single-flight refresh, and retry once.
- Tables sync `page`, `size`, `search`, `sortBy`, and `sortDirection` to URL with 300ms debounce. BaseSearchRequest serializes `filters` as `JSON.stringify`.
- Notifications hydrate from REST and invalidate cache from STOMP `/user/queue/notifications` after connect or message.

## Design system and animation

- Light-only design uses Inter via `next/font`, violet `#6C47FF`, 44px targets, 240px/72px sidebar, 1100px content max, 48px data rows, 10px buttons, 8px inputs, and 12px panels/charts.
- Button variants implemented: `primary`, `secondary`, `outline`, `ghost`, `destructive`, and `icon`; loading keeps width stable and disables double submit.
- KPI `AnimatedMetric` uses Motion `useMotionValue`, `useSpring`, and `useReducedMotion`; visual number is `aria-hidden` while final value is exposed by accessible label.
- Chart primitives include `ChartFrame`, `ChartHeader`, `ChartLegend`, `ChartTooltip`, `ChartSkeleton`, `ChartEmpty`, `ChartError`, and `ChartDataTable`.
- Recharts animations are viewport-gated, reduced-motion aware, and use violet/indigo/lavender palette.
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
- `FE/src/features/resources/resource-view.tsx`: generic permission-first resource table shell for V1 modules.
- `FE/src/**/*.test.*` and `FE/e2e/login.spec.ts`: unit/integration and E2E coverage.
- `FE/src/components/ui/button.tsx`: fixed Radix Slot `asChild` behavior so the Slot receives exactly one child element and no loading wrapper overlay.
- `FE/src/components/ui/button.test.tsx`: added regression coverage for `Button asChild` with `next/link` and kept loading double-submit coverage UTF-8 safe.
- `FE/src/lib/api/client.ts`: kept envelope errors as typed thrown errors for callers, added shared error-message extraction, and restored UTF-8 Vietnamese fallback messages.
- `FE/src/features/auth/login-view.tsx`: catches login envelope errors, shows the server message in toast and form state, and prevents Next dev runtime overlay for invalid credentials.
- `FE/src/features/auth/change-password-view.tsx`: catches submit errors after mutation toast and writes the message into form state instead of leaking the rejection.
- `FE/src/features/auth/login-view.test.tsx` and `FE/src/lib/api/client.test.ts`: cover server-message propagation and login-form toast handling.
- `FE/src/features/workspace/app-shell.tsx`: logout now calls `/auth/logout` with the in-memory Bearer token and refresh cookie through `apiFetch`, treats the server call as best-effort, clears TanStack Query cache, clears Zustand auth memory, disables duplicate logout clicks while pending, and routes back to `/login`.

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

## Remaining FE work

- Replace generic resource forms with domain-specific create/update dialogs for every module.
- Add live smoke with real E2E credentials from ignored env when available.
- Expand visual audit beyond login to authenticated dashboard, analytics, table, form, modal, empty/error/loading states once a seeded test account is available.
- Add richer tests for chart reduced-motion toggling and STOMP reconnect payload behavior with MSW/browser mocks.
