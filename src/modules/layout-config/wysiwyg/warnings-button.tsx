"use client";

import * as Popover from "@radix-ui/react-popover";
import { CheckCircle, Keyboard, Warning, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { LayoutWarning } from "./layout-analysis";

const LEVEL_STYLE = {
  error: "text-danger",
  warn: "text-warning",
  info: "text-text-secondary",
} as const;

// Nút cảnh báo bố cục: số cảnh báo hiện ngay trên nút; bấm để xem danh sách và chọn phần tử liên quan.
export function WarningsButton({ warnings, onSelect }: { warnings: LayoutWarning[]; onSelect: (indexes: number[]) => void }) {
  const errors = warnings.filter((w) => w.level === "error").length;
  const tone = errors > 0 ? "text-danger" : warnings.some((w) => w.level === "warn") ? "text-warning" : warnings.length > 0 ? "text-text-secondary" : "text-success";
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={warnings.length === 0 ? "Bố cục không có cảnh báo" : `Có ${warnings.length} cảnh báo bố cục`}
          className={cn(
            "pointer-events-auto inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold shadow-md hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
            tone,
          )}
          type="button"
        >
          {warnings.length === 0 ? <CheckCircle size={16} weight="fill" /> : errors > 0 ? <WarningCircle size={16} weight="fill" /> : <Warning size={16} weight="fill" />}
          {warnings.length === 0 ? "Ổn" : `${warnings.length} cảnh báo`}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" className="z-50 w-[340px] rounded-xl border border-border bg-white p-2 shadow-[var(--shadow-card)]" collisionPadding={12} side="top" sideOffset={8}>
          <p className="px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Kiểm tra bố cục</p>
          {warnings.length === 0 ? (
            <p className="px-1.5 py-2 text-sm text-text-secondary">Không phát hiện vấn đề: chữ đủ lớn, không tràn trang, không chồng nhau.</p>
          ) : (
            <ul className="max-h-[260px] space-y-1 overflow-y-auto">
              {warnings.map((warning) => (
                <li key={warning.id}>
                  <button
                    className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] leading-5 text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
                    disabled={warning.indexes.length === 0}
                    onClick={() => onSelect(warning.indexes)}
                    type="button"
                  >
                    <span className={cn("mt-0.5 shrink-0", LEVEL_STYLE[warning.level])}>{warning.level === "error" ? <WarningCircle size={15} weight="fill" /> : <Warning size={15} weight="fill" />}</span>
                    {warning.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="px-1.5 pt-2 text-[11px] leading-4 text-muted">Chiều rộng chữ là ước lượng theo dữ liệu mẫu đang chọn; hãy dùng mẫu «Tên dài» để thử trường hợp xấu nhất.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ["Kéo / Shift + nhấp / kéo vùng trống", "Di chuyển / chọn nhiều"],
  ["Mũi tên (Shift = bước lớn)", "Dịch phần tử đang chọn"],
  ["Nhấp đúp vào chữ / vào chỗ trống", "Sửa chữ tại chỗ / thêm văn bản"],
  ["Ctrl + A", "Chọn tất cả phần tử"],
  ["Ctrl + C / Ctrl + V", "Sao chép / dán (dùng được giữa hai mặt thẻ)"],
  ["Ctrl + D", "Nhân bản"],
  ["Delete", "Xóa phần tử đang chọn"],
  ["Ctrl + ] / Ctrl + [", "Đưa lên trên / xuống dưới một lớp"],
  ["Ctrl + Z / Ctrl + Y", "Hoàn tác / làm lại"],
  ["Ctrl + lăn chuột, Ctrl + + / − / 0", "Phóng to / thu nhỏ / vừa khung"],
  ["Giữ phím cách + kéo (hoặc chuột giữa)", "Kéo khung khi đang phóng to"],
  ["Esc", "Bỏ chọn"],
];

// Bảng trợ giúp phím tắt.
export function ShortcutsHelp() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Phím tắt"
          className="pointer-events-auto grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-border bg-white text-text-secondary shadow-md hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          title="Phím tắt"
          type="button"
        >
          <Keyboard size={17} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" className="z-50 w-[360px] rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-card)]" collisionPadding={12} side="top" sideOffset={8}>
          <p className="pb-2 text-sm font-semibold text-foreground">Phím tắt trong trình thiết kế</p>
          <dl className="space-y-1.5 text-[13px]">
            {SHORTCUTS.map(([keys, action]) => (
              <div className="flex items-start justify-between gap-3" key={keys}>
                <dt className="font-medium text-foreground">{keys}</dt>
                <dd className="text-right text-text-secondary">{action}</dd>
              </div>
            ))}
          </dl>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
