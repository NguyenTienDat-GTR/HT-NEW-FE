# Thiết kế giao diện C-LEAD (Ecclesia Youth Ops)

Nguồn sự thật là mã nguồn: `src/styles/tokens.css` (biến màu, bo góc, đổ bóng) và `src/app/globals.css` (ánh xạ sang Tailwind v4 qua `@theme inline`). File này chỉ tóm tắt quy ước để đọc nhanh; khi lệch với `tokens.css` thì `tokens.css` đúng và phải sửa lại file này.

## Định hướng

- Trang quản trị nội bộ cho giáo phận / giáo hạt / giáo xứ: nhiều bảng và biểu mẫu, ưu tiên rõ ràng và mật độ thông tin vừa phải.
- Chỉ có giao diện sáng (không có dark mode).
- Thương hiệu: `C-LEAD`, logo `public/brand/c-lead.png`, hằng số ở `src/components/brand/brand-mark.tsx`.

## Màu (dùng token, không viết mã màu rời trong component)

| Vai trò | Token | Giá trị |
|---|---|---|
| Nền trang | `--background`, `--app-canvas` | `#f8fafc` |
| Thẻ, bảng, hộp thoại | `--card`, `--surface-1` | `#ffffff` |
| Nền phụ, hover | `--surface-2`, `--surface-hover` | `#f1f5f9` |
| Chữ chính / chữ phụ / chữ mờ | `--foreground` / `--text-secondary` / `--muted` | `#0f172a` / `#475569` / `#64748b` |
| Viền / viền ô nhập | `--border` / `--input` | `#e2e8f0` / `#cbd5e1` |
| Chính (xanh Đức Mẹ) | `--primary`, hover `--primary-hover`, nền nhạt `--primary-soft` | `#1e40af`, `#1e3a8a`, `#eff6ff` |
| Nhấn (vòng focus) | `--accent`, `--primary-ring` | `#38bdf8` |
| Thành công / cảnh báo / nguy hiểm / thông tin | `--success` / `--warning` / `--danger` / `--info` | `#047857` / `#b45309` / `#b91c1c` / `#2563eb` |

- Trạng thái hồ sơ: `--status-active|inactive|leave|suspended`. Cấp độ huynh trưởng: `--level-*`. Nhãn: `--badge-*-bg` / `--badge-*-fg`.
- Biểu đồ dùng riêng nhóm `--viz-*` (đã kiểm tra mù màu trên nền trắng); màu gán theo thực thể, không theo thứ hạng.
- Không hiển thị "ngành" (Ấu, Thiếu, Nghĩa, Hiệp…) trong thông tin huynh trưởng.

## Chữ

- Một phông duy nhất: Plus Jakarta Sans (`next/font/google`, subset `latin` + `vietnamese`, độ đậm 400–700), biến `--font-sans`.
- Cột số, ngày, số điện thoại trong bảng: gắn thuộc tính `data-tnum` để dùng chữ số đều cột.

## Hình khối và khoảng cách

- Bo góc: ô nhập và nút 8px (`--radius-input`, `--radius-button`), thẻ / bảng 12px (`--radius-panel`), nhãn trạng thái và avatar bo tròn.
- Khoảng cách theo lưới 4px/8px: `--space-2xs` (4px) … `--space-xl` (32px).
- Đổ bóng nhẹ: `--shadow-card` cho thẻ, `--shadow-elevated` cho hộp thoại / popover.
- Thanh bên: 260px khi mở, 76px khi thu gọn.

## Thành phần dùng chung

- `src/components/ui`: `Button` (biến thể `primary`, `secondary`, `outline`, `ghost`, `destructive`, `icon`; cỡ `sm` 36px, mặc định 40px, `lg` 48px), `Input`, `Panel`, `Tip`, `HelpTip`, `TooltipIconButton`.
- `src/components/common/resource`: khung danh sách (bảng, bộ lọc, phân trang, khung chi tiết) cho mọi module.
- `src/components/form/resource-form`: khung biểu mẫu tạo / sửa.
- Icon: Phosphor Icons (`@phosphor-icons/react`). Thông báo nhanh: Sonner.

## Tương tác và trợ năng

- Vòng focus luôn nhìn thấy (`outline` 2px màu `--primary`).
- Chuyển động ngắn (khoảng 200ms) và chỉ chạy trong `motion-safe`.
- Nút đang xử lý phải khóa bấm lặp.
- Ảnh cần có `alt`; nút chỉ có icon cần `aria-label` hoặc tooltip.
- Trang đăng nhập được kiểm tra bằng axe trong `e2e/login.spec.ts`.
