"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

// Tooltip mô tả chức năng cho nút thao tác. Nút bị vô hiệu hóa vẫn hiện tooltip nhờ bọc span.
export function Tip({ label, children, disabled = false }: { label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{disabled ? <span className="inline-flex">{children}</span> : children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[60] max-w-xs rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-card)]"
          sideOffset={8}
        >
          {label}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
