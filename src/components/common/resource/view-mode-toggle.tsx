"use client";

import { Rows, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "card";

// Công tắc chuyển giữa chế độ xem thẻ và bảng, dùng chung cho các danh sách có hai cách xem.
export function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options = [
    ["card", "Thẻ", SquaresFour],
    ["table", "Bảng", Rows],
  ] as const;
  return (
    <div aria-label="Chế độ xem" className="inline-flex rounded-lg bg-surface-2 p-1" role="group">
      {options.map(([value, label, Icon]) => (
        <button
          aria-pressed={mode === value}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
            mode === value ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground",
          )}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          <Icon size={15} weight={mode === value ? "fill" : "regular"} /> {label}
        </button>
      ))}
    </div>
  );
}
