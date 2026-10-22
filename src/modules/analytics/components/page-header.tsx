import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, eyebrow, actions }: { title: string; subtitle: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <div className="mb-2 inline-flex h-7 items-center rounded-full border border-border bg-white px-3 text-xs font-semibold text-muted">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold leading-8 tracking-[0] text-foreground">{title}</h1>
        <p className="mt-1 max-w-[78ch] text-sm text-text-secondary">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
