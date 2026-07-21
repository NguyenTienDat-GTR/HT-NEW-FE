import { CrownCross } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-primary text-white shadow-[var(--shadow-accent)]">
        <span className="absolute inset-[3px] rounded-[11px] border border-white/20" />
        <CrownCross className="relative h-6 w-6" weight="fill" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5 text-foreground">HT Management</span>
          <span className="block truncate text-xs leading-4 text-muted">Quản lý Huynh trưởng</span>
        </span>
      ) : null}
    </span>
  );
}
