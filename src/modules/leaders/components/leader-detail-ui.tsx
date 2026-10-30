"use client";

import { HouseLine, User } from "@phosphor-icons/react";
import { type ReactNode } from "react";
import { FormField } from "@/components/form/resource-form/form-controls";
import type { FormFieldSpec } from "@/components/form/resource-form/types";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";
import { displayValue } from "./leader-detail-utils";

export function SectionCard({title, icon: Icon, children}: { title: string; icon: typeof User; children: ReactNode }) {
    return (
        <Panel className="h-full p-4">
            <div className="mb-3 flex items-center gap-2.5">
                <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon size={17} weight="duotone"/>
                </span>
                <h3 className="text-base font-semibold leading-6 tracking-[0] text-foreground">{title}</h3>
            </div>
            {children}
        </Panel>
    );
}

export function ProfileField({
                          label,
                          value,
                          editing,
                          field,
                          editValue,
                          onChange,
                          error,
                      }: {
    label: string;
    value: unknown;
    editing?: boolean;
    field?: FormFieldSpec;
    editValue?: string;
    onChange?: (value: unknown) => void;
    error?: string;
}) {
    if (editing && field && onChange) {
        return (
            <div className="w-full space-y-1">
                <FormField
                    error={error}
                    field={field}
                    mode="edit"
                    onChange={onChange}
                    value={editValue}
                />
            </div>
        );
    }

    return (
        <div className="w-full space-y-1">
            <p className="text-[13px] font-medium leading-5 tracking-[0] text-muted">{label}</p>
            <p className="flex min-h-9 items-center rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm font-medium leading-5 text-foreground">
                {displayValue(value)}
            </p>
        </div>
    );
}

export function MetaText({label, value}: { label: string; value: string }) {
    return (
        <span className="inline-flex min-h-7 items-center gap-1.5">
            <span className="font-semibold text-foreground">{label}:</span>
            <span>{value}</span>
        </span>
    );
}

export function HeaderFact({icon: Icon, value}: { icon: typeof HouseLine; value: unknown }) {
    if (!value) return null;
    return (
        <span className="inline-flex min-w-0 items-center gap-2">
      <Icon className="shrink-0 text-muted" size={17}/>
      <span className="truncate">{displayValue(value)}</span>
    </span>
    );
}

export function levelBadgeClass(level: string) {
    if (level === "HT_II") return "bg-[var(--badge-level-mid-bg)] text-[var(--badge-level-mid-fg)]";
    if (level === "HT_III" || level.startsWith("HLV_")) return "bg-[var(--badge-level-high-bg)] text-[var(--badge-level-high-fg)]";
    return "bg-[var(--badge-level-low-bg)] text-[var(--badge-level-low-fg)]";
}

export function LevelBadge({level}: { level: string }) {
    return (
        <span
            className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", levelBadgeClass(level))}>
      {formatLeaderLevel(level)}
    </span>
    );
}

export function StatusBadge({active}: { active: boolean }) {
    return (
        <span
            className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", active ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]" : "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]")}>
      {active ? "Đang hoạt động" : "Tạm ngưng"}
    </span>
    );
}

export function LeaderDetailSkeleton() {
    return (
        <div className="space-y-5">
            <div className="h-20 rounded-xl bg-surface-2 motion-safe:animate-pulse"/>
            <Panel className="p-5">
                <div className="flex gap-4">
                    <div className="h-24 w-24 rounded-full bg-surface-2 motion-safe:animate-pulse"/>
                    <div className="flex-1 space-y-3">
                        <div className="h-7 w-72 max-w-full rounded bg-surface-2 motion-safe:animate-pulse"/>
                        <div className="h-4 w-full max-w-xl rounded bg-surface-2 motion-safe:animate-pulse"/>
                    </div>
                </div>
            </Panel>
            <div className="grid gap-5 xl:grid-cols-2">
                <div className="h-80 rounded-xl bg-surface-2 motion-safe:animate-pulse"/>
                <div className="h-80 rounded-xl bg-surface-2 motion-safe:animate-pulse"/>
            </div>
        </div>
    );
}
