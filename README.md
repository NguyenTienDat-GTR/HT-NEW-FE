# C-LEAD FE (HT Management)

Giao diện web quản lý huynh trưởng: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4. Backend là repo `HT-NEW` (Spring Boot), chạy ở cổng `1007`.

## Chạy trên máy

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Mở http://localhost:3000. Trình duyệt gọi `/backend/api/*`, Next.js chuyển tiếp sang `${BACKEND_ORIGIN}/api/*` (xem `next.config.ts`).

| Biến | Ý nghĩa |
|---|---|
| `BACKEND_ORIGIN` | Địa chỉ BE, mặc định `http://localhost:1007`. Được nhúng lúc build. |
| `NEXT_PUBLIC_WS_URL` | Địa chỉ WebSocket thông báo. Để trống = dùng cùng tên miền với trang đang mở (production). |
| `E2E_USERNAME`, `E2E_PASSWORD` | Tài khoản cho kiểm thử E2E trên máy (tùy chọn). |

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` / `build` / `start` | Chạy dev, build production, chạy bản build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit test bằng Vitest (`tests/unit`) |
| `npm run test:e2e` | Playwright (`e2e`), tự bật dev server ở cổng 3000 |
| `npm run api:capture` | Lấy OpenAPI từ BE đang chạy về `openapi/ht-management.json` |
| `npm run api:generate` | Sinh `src/lib/api/schema.d.ts` từ file OpenAPI |

CI (`.github/workflows/ci.yml`) chạy lint, typecheck, test và build cho mọi PR vào `test` và `main`.

## Cấu trúc

```
src/app            route (mỏng), layout, globals.css
src/modules        màn hình và logic theo từng nghiệp vụ
src/components     thành phần dùng chung (ui, common/resource, form/resource-form)
src/config/routes  khai báo route, menu, quyền
src/lib            API client, auth, tiện ích
src/styles         tokens.css (màu, bo góc, đổ bóng)
tests/unit         unit test (không đặt test trong src)
e2e                kiểm thử Playwright
```

## Quy trình nhánh và phát hành

1. Tạo nhánh từ `main`, mở PR vào `test`. Merge xong, workflow `CD test` đưa lên môi trường test.
2. Thử ổn trên test thì mở PR `test` -> `main`. Merge xong, workflow `CD` đưa lên production.
3. PR vào `main` chỉ được tạo từ nhánh `test` (CI có job `source-branch` kiểm tra).

## Tài liệu khác

- `DESIGN.md`: quy ước giao diện.
- `agent.md`: quy tắc làm việc và nhật ký thay đổi của FE.
- `CHANGELOG.md`: thay đổi theo phiên bản.
