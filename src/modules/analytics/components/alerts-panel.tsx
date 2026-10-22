"use client";

import { ArrowRight, CheckCircle, Info, Warning, WarningOctagon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { alertMeta, severityMeta } from "@/modules/analytics/labels";
import type { Alert, AlertSeverity } from "@/modules/analytics/types";

const ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

const SEVERITY_STYLE: Record<AlertSeverity, { icon: typeof Info; box: string; badge: string; bar: string }> = {
  critical: { icon: WarningOctagon, box: "bg-[#fdecec] text-[var(--viz-critical)]", badge: "bg-[#fdecec] text-[var(--viz-delta-bad)]", bar: "bg-[var(--viz-critical)]" },
  warning: { icon: Warning, box: "bg-[#fff4d6] text-[#8a5a00]", badge: "bg-[#fff4d6] text-[#8a5a00]", bar: "bg-[var(--viz-warning)]" },
  info: { icon: Info, box: "bg-primary-soft text-primary", badge: "bg-primary-soft text-primary", bar: "bg-[var(--viz-1)]" },
};

function itemValue(value: number | null | undefined, suffix?: string) {
  if (value === null || value === undefined) return null;
  const text = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
  return suffix ? (suffix.startsWith("%") ? `${text}%` : `${text} ${suffix}`) : text;
}

/** Danh sách điểm cần chú ý: mỗi mục có biểu tượng + nhãn mức độ (không chỉ dựa vào màu), mô tả, vài đối tượng tiêu biểu và lối tắt xử lý. */
export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const sorted = [...alerts].filter((alert) => alertMeta[alert.key]).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  if (!sorted.length) {
    return (
      <div className="grid min-h-[160px] place-items-center rounded-lg bg-[#f0f9f0] p-6 text-center">
        <div>
          <CheckCircle className="mx-auto h-8 w-8 text-[var(--viz-good)]" weight="fill" />
          <p className="mt-2 text-sm font-semibold text-foreground">Chưa có điểm bất thường</p>
          <p className="mt-0.5 text-[13px] text-muted">Các chỉ số đều trong ngưỡng theo dõi.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {sorted.map((alert, index) => {
        const meta = alertMeta[alert.key];
        const style = SEVERITY_STYLE[alert.severity];
        const Icon = style.icon;
        return (
          <li className="analytics-rise relative overflow-hidden rounded-lg border border-border bg-white p-4 pl-5 transition-shadow hover:shadow-md" key={alert.key} style={{ animationDelay: `${index * 50}ms` }}>
            <span className={cn("absolute inset-y-0 left-0 w-1", style.bar)} />
            <div className="flex items-start gap-3">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", style.box)}>
                <Icon className="h-5 w-5" weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{meta.title}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", style.badge)}>{severityMeta[alert.severity].label}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-5 text-text-secondary">{meta.description(alert.count)}</p>
                {alert.items?.length ? (
                  <ul className="mt-2 space-y-1">
                    {alert.items.slice(0, 3).map((item, itemIndex) => (
                      <li className="flex items-center justify-between gap-3 text-xs text-muted" key={`${item.id ?? item.label}-${itemIndex}`}>
                        <span className="min-w-0 truncate">{item.label}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-text-secondary">{itemValue(item.value, meta.valueSuffix)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {alert.href ? (
                <Link aria-label={`Xử lý: ${meta.title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary" href={alert.href as Route}>
                  <ArrowRight className="h-4 w-4" weight="bold" />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
