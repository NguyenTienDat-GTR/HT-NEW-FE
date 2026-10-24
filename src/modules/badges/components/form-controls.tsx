"use client";

import { Info } from "@phosphor-icons/react";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { HelpTip } from "@/components/ui/help-tip";
import { cn } from "@/lib/utils";

export const SELECT_CLASS =
  "h-10 cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";

// Nhãn + ô nhập. Nút trợ giúp nằm ngoài <label> để nhãn gắn đúng với ô nhập (không gắn nhầm với nút trợ giúp).
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const generatedId = useId();
  const child = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const controlId = child?.props.id ?? generatedId;
  return (
    <div className={cn("block", className)}>
      <span className="mb-1 flex items-center gap-1 text-[13px] font-medium text-text-secondary">
        <label htmlFor={controlId}>{label}</label>
        {hint ? <HelpTip label={`Hướng dẫn: ${label}`}>{hint}</HelpTip> : null}
      </span>
      {child && !child.props.id ? cloneElement(child, { id: controlId }) : children}
    </div>
  );
}

export function StyleToggle({ active, disabled, label, onClick, children }: { active: boolean; disabled: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid h-10 w-10 cursor-pointer place-items-center rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
        active ? "border-primary bg-primary-soft text-primary" : "border-input bg-white text-text-secondary hover:bg-slate-50",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function Callout({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "danger" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-5",
        tone === "danger" ? "border-danger/30 bg-danger/5 text-foreground" : tone === "warning" ? "border-warning/40 bg-warning/10 text-foreground" : "border-border bg-white text-text-secondary",
      )}
      role={tone === "info" ? "note" : "alert"}
    >
      <Info className={cn("mt-0.5 shrink-0", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-primary")} size={18} weight="fill" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Pill({ children, tone }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "danger" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "primary" && "bg-primary-soft text-primary",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/20 text-[var(--badge-warning-fg)]",
        tone === "danger" && "bg-danger/10 text-danger",
        !tone && "bg-surface-2 text-text-secondary",
      )}
    >
      {children}
    </span>
  );
}
