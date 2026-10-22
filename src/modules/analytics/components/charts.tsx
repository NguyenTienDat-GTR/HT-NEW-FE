"use client";

import { cn, viNumber } from "@/lib/utils";
import { entityColor } from "@/modules/analytics/components/charts-extra";
import { funnelLabels } from "@/modules/analytics/labels";
import type { FunnelStep } from "@/modules/analytics/types";

export type BarItem = {
  key: string;
  label: string;
  value: number;
  /** Chú thích phụ bên dưới nhãn, vd. "Đạt 85%". */
  note?: string;
  /** Giá trị hiện ở đầu thanh; mặc định là value đã định dạng. */
  display?: string;
  color?: string;
};

type BarListProps = {
  items: BarItem[];
  onSelect?: (item: BarItem) => void;
  color?: string;
  /** Mẫu số để tính độ dài thanh; mặc định là giá trị lớn nhất. */
  max?: number;
  limit?: number;
  /** Mọi thanh một màu (dùng khi các hạng mục là một chuỗi thống nhất); mặc định mỗi hạng mục một màu ổn định theo định danh. */
  uniform?: boolean;
  ariaLabel: string;
};

/** Thanh ngang xếp hạng: một màu cho danh mục không có thứ tự, thanh dày 10px bo đầu 4px, giá trị ở đầu thanh. */
export function BarList({ items, onSelect, color = "var(--viz-1)", max, limit = 8, uniform, ariaLabel }: BarListProps) {
  const rows = items.slice(0, limit);
  const top = max ?? Math.max(...rows.map((item) => item.value), 1);
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {rows.map((item, index) => {
        const ratio = Math.max(0, Math.min(1, item.value / top));
        const tone = item.color ?? (uniform ? color : entityColor(item.key));
        const content = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-foreground" title={item.label}>
                {item.label}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{item.display ?? viNumber.format(item.value)}</span>
            </span>
            <span className="mt-1.5 block h-2.5 overflow-hidden rounded-r-[4px] bg-surface-2">
              <span
                className="analytics-grow block h-full rounded-r-[4px] transition-[width,filter] duration-500 group-hover/bar:brightness-110"
                style={{ width: `${ratio * 100}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${tone} 55%, white), ${tone})`, animationDelay: `${index * 60}ms` }}
              />
            </span>
            {item.note ? <span className="mt-1 block text-xs text-muted">{item.note}</span> : null}
          </>
        );
        return (
          <li key={item.key}>
            {onSelect ? (
              <button
                aria-label={`${item.label}: ${item.display ?? viNumber.format(item.value)}. Xem chi tiết`}
                className="group/bar block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => onSelect(item)}
                type="button"
              >
                {content}
              </button>
            ) : (
              <div className="group/bar px-2 py-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Thang thứ tự (ordinal) cho các bước phễu, từ nhạt tới đậm; bước nhạt nhất vẫn đạt tương phản 2:1 trên nền trắng.
const FUNNEL_RAMP = ["var(--viz-seq-250)", "var(--viz-seq-350)", "var(--viz-seq-450)", "var(--viz-seq-550)", "var(--viz-seq-650)"];

type FunnelProps = {
  steps: FunnelStep[];
  onSelect?: (step: FunnelStep) => void;
  labels?: Record<string, string>;
};

/** Phễu lồng nhau: mỗi bước là tập con của bước trước nên tỷ lệ luôn ≤ 100%; đầu thanh ghi số và % so với bước trước. */
export function FunnelChart({ steps, onSelect, labels = funnelLabels }: FunnelProps) {
  const first = Math.max(steps[0]?.count ?? 0, 1);
  return (
    <ol aria-label="Phễu chuyển đổi" className="space-y-3">
      {steps.map((step, index) => {
        const ratio = Math.min(1, step.count / first);
        const dropped = index > 0 ? steps[index - 1].count - step.count : 0;
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{labels[step.key] ?? step.key}</span>
              <span className="text-sm tabular-nums">
                <span className="font-semibold text-foreground">{viNumber.format(step.count)}</span>
                {step.rateOfPrevious !== null ? <span className="ml-2 text-xs text-muted">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(step.rateOfPrevious)}% so với bước trước</span> : null}
              </span>
            </span>
            <span className="mt-1.5 block h-7 overflow-hidden rounded-r-[4px] bg-surface-2">
              <span
                className="analytics-grow block h-full rounded-r-[4px] transition-[width] duration-500"
                style={{ width: `${Math.max(ratio * 100, step.count > 0 ? 1.5 : 0)}%`, background: FUNNEL_RAMP[Math.min(index, FUNNEL_RAMP.length - 1)], animationDelay: `${index * 70}ms` }}
              />
            </span>
            {index > 0 && dropped > 0 ? <span className="mt-1 block text-xs text-muted">Giảm {viNumber.format(dropped)} so với bước trước</span> : null}
          </>
        );
        return (
          <li key={step.key}>
            {onSelect ? (
              <button className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onSelect(step)} type="button">
                {body}
              </button>
            ) : (
              <div className="px-2 py-1.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export type ShareSegment = { key: string; label: string; value: number; color: string };

/** Cơ cấu 100%: các đoạn cách nhau 2px bằng màu nền, không viền; chú giải luôn hiện cho từ 2 nhóm trở lên. */
export function StackedShare({ segments, onSelect, ariaLabel }: { segments: ShareSegment[]; onSelect?: (segment: ShareSegment) => void; ariaLabel: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;
  const visible = segments.filter((segment) => segment.value > 0);
  return (
    <div>
      <div aria-label={ariaLabel} className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img">
        {visible.map((segment, index) => (
          <button
            aria-label={`${segment.label}: ${viNumber.format(segment.value)}`}
            className={cn("analytics-grow h-full min-w-[3px] cursor-pointer transition-[filter,flex-grow] duration-300 first:rounded-l-[4px] last:rounded-r-[4px] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary", !onSelect && "cursor-default")}
            key={segment.key}
            onClick={onSelect ? () => onSelect(segment) : undefined}
            style={{ flexGrow: segment.value, flexBasis: 0, background: segment.color, animationDelay: `${index * 60}ms` }}
            title={`${segment.label}: ${viNumber.format(segment.value)} (${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format((segment.value / total) * 100)}%)`}
            type="button"
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((segment) => (
          <li className="inline-flex items-center gap-2 text-[13px] text-text-secondary" key={segment.key}>
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: segment.color }} />
            {segment.label}
            <span className="font-semibold tabular-nums text-foreground">{viNumber.format(segment.value)}</span>
            <span className="text-xs tabular-nums text-muted">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format((segment.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-text-secondary">
      <span className="h-0.5 w-4 rounded-full" style={dashed ? { background: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` } : { background: color }} />
      {label}
    </span>
  );
}
