"use client";

import { ArrowRight, CalendarCheck, Certificate, ClipboardText, PencilLine } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { cn, viNumber } from "@/lib/utils";
import { workQueueMeta } from "@/modules/analytics/labels";
import type { WorkQueueItem } from "@/modules/analytics/types";

const ICONS = { pendingRegistrations: ClipboardText, pendingScoring: PencilLine, closingCourses: CalendarCheck, pendingCertificates: Certificate } as const;
const TONES: Record<string, string> = {
  pendingRegistrations: "bg-primary-soft text-primary",
  pendingScoring: "bg-[#e6f4ff] text-[#1c5cab]",
  closingCourses: "bg-[#fff4d6] text-[#8a5a00]",
  pendingCertificates: "bg-[#e8f5e8] text-[#006300]",
};

/** Lối tắt tới việc cần xử lý; thẻ có việc nổi lên (chấm + số đậm), thẻ trống mờ đi nhưng vẫn bấm được. */
export function WorkQueue({ items }: { items: WorkQueueItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const meta = workQueueMeta[item.key];
        if (!meta) return null;
        const Icon = ICONS[item.key as keyof typeof ICONS] ?? ClipboardText;
        const hasWork = item.count > 0;
        return (
          <Link
            className={cn(
              "analytics-rise group relative rounded-xl border bg-white p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
              hasWork ? "border-border" : "border-border opacity-80",
            )}
            href={item.href as Route}
            key={item.key}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <span className={cn("grid h-10 w-10 place-items-center rounded-lg", TONES[item.key])}>
                <Icon className="h-5 w-5" weight="bold" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" weight="bold" />
            </div>
            <p className="mt-4 flex items-center gap-2 text-[26px] font-bold leading-8 tracking-[-0.02em] tabular-nums text-foreground">
              {viNumber.format(item.count)}
              {hasWork ? <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--viz-serious)]" /> : null}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{meta.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{hasWork ? meta.description : "Không có việc tồn đọng."}</p>
          </Link>
        );
      })}
    </div>
  );
}
