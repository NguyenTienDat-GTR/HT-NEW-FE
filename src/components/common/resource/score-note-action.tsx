"use client";

import * as Popover from "@radix-ui/react-popover";
import { NotePencil } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { cn } from "@/lib/utils";
import type { ScoreNotes } from "./score-entry";

const MAX_LENGTH = 1000;

// Hành động ghi chú ở tab chấm điểm: bấm mở hộp nhập ghi chú, tắt hộp là tự lưu tạm (chỉ gửi lên server khi bấm nút lưu).
// Hồ sơ đã có ghi chú thì nút đổi màu.
export function ScoreNoteAction({ rowId, row, notes }: { rowId: string; row: Record<string, unknown>; notes: ScoreNotes }) {
  const value = notes.valueOf(rowId, row);
  const hasNote = value.trim() !== "";
  const unsaved = notes.isDirty(rowId);
  const editable = notes.editable;

  return (
    <Popover.Root>
      <Tip label={hasNote ? "Xem / sửa ghi chú" : editable ? "Thêm ghi chú" : "Chưa có ghi chú"}>
        <Popover.Trigger asChild>
          <Button
            aria-label="Ghi chú hồ sơ"
            className={cn("h-8 min-w-8 rounded-lg", hasNote && "bg-warning/15 text-warning hover:bg-warning/25")}
            size="icon"
            type="button"
            variant="icon"
          >
            <NotePencil size={16} weight={hasNote ? "fill" : "regular"} />
          </Button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-[60] w-[320px] rounded-[12px] border border-border bg-white p-3 shadow-[var(--shadow-elevated)] focus:outline-none"
          sideOffset={8}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">Ghi chú · {String(row.leaderFullName ?? "Hồ sơ")}</p>
            {unsaved ? <span className="shrink-0 text-xs font-medium text-warning">Chưa lưu</span> : null}
          </div>
          <textarea
            autoFocus
            className="min-h-28 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)] disabled:bg-surface-2"
            maxLength={MAX_LENGTH}
            onChange={(event) => notes.onChange(rowId, row, event.target.value)}
            placeholder={editable ? "Nhập ghi chú cho hồ sơ này" : "Chưa có ghi chú"}
            readOnly={!editable}
            value={value}
          />
          <p className="mt-1.5 text-xs text-muted">
            {editable ? `Ghi chú được lưu tạm khi đóng hộp; bấm nút lưu trên trang để gửi lên hệ thống. (${value.length}/${MAX_LENGTH})` : "Khóa đã kết thúc hoặc bị vô hiệu hóa nên không thể sửa ghi chú."}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
