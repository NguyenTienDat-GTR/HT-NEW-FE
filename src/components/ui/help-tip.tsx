"use client";

import { Question } from "@phosphor-icons/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Dấu "?" nhỏ cạnh nhãn: rê chuột, focus bàn phím hoặc chạm để xem hướng dẫn, thay cho đoạn chữ dài dưới ô nhập.
export function HelpTip({ children, label = "Xem hướng dẫn", className }: { children: ReactNode; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>
        <button
          aria-label={label}
          className={cn(
            "inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]",
            className,
          )}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          type="button"
        >
          <Question size={14} weight="bold" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[70] max-w-[300px] rounded-lg border border-border bg-white px-3 py-2 text-xs font-normal leading-5 text-foreground shadow-[var(--shadow-card)]"
          collisionPadding={12}
          side="top"
          sideOffset={6}
        >
          {children}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
