"use client";

import { useState } from "react";
import { cn, viNumber } from "@/lib/utils";

const PERCENT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Màu ổn định theo định danh (không theo thứ hạng): lọc bớt/đổi thứ tự không làm đổi màu của phần tử còn lại. */
export function entityColor(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return `var(--viz-${(hash % 6) + 1})`;
}

// ------------------------------------------------------------------ Donut

export type DonutSegment = { key: string; label: string; value: number; color: string };

type DonutProps = {
  segments: DonutSegment[];
  onSelect?: (segment: DonutSegment) => void;
  centerLabel?: string;
  ariaLabel: string;
  size?: number;
};

/** Vòng cơ cấu: các cung vẽ lần lượt khi vào viewport, hover một cung thì tâm vòng hiện số liệu của cung đó; chú giải luôn hiện bên cạnh. */
export function DonutChart({ segments, onSelect, centerLabel = "Tổng", ariaLabel, size = 164 }: DonutProps) {
  const [hover, setHover] = useState<string | null>(null);
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const thickness = 22;
  const radius = (size - thickness) / 2;
  const active = visible.find((segment) => segment.key === hover);
  const starts = visible.map((_, index) => visible.slice(0, index).reduce((sum, item) => sum + (item.value / (total || 1)) * 100, 0));

  if (total <= 0) return null;
  const gap = visible.length > 1 ? 1.4 : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg aria-label={ariaLabel} className="-rotate-90" height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
          <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="var(--surface-2)" strokeWidth={thickness} />
          {visible.map((segment, index) => {
            const share = (segment.value / total) * 100;
            const dash = Math.max(share - gap, 0.5);
            const start = starts[index];
            const highlighted = hover === segment.key;
            return (
              <circle
                className={cn("analytics-sweep origin-center cursor-pointer transition-[stroke-width,opacity] duration-200", onSelect ? "" : "cursor-default")}
                cx={size / 2}
                cy={size / 2}
                fill="none"
                key={segment.key}
                onBlur={() => setHover(null)}
                onClick={onSelect ? () => onSelect(segment) : undefined}
                onFocus={() => setHover(segment.key)}
                onMouseEnter={() => setHover(segment.key)}
                onMouseLeave={() => setHover(null)}
                opacity={hover && !highlighted ? 0.45 : 1}
                pathLength={100}
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${dash} 100`}
                strokeDashoffset={-start}
                strokeLinecap="butt"
                strokeWidth={highlighted ? thickness + 5 : thickness}
                style={{ ["--dash" as string]: dash, animationDelay: `${index * 110}ms` } as React.CSSProperties}
                tabIndex={onSelect ? 0 : undefined}
              >
                <title>{`${segment.label}: ${viNumber.format(segment.value)} (${PERCENT.format(share)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="max-w-[96px]">
            <p className="text-2xl font-bold leading-7 tabular-nums text-foreground">{viNumber.format(active ? active.value : total)}</p>
            <p className="mt-0.5 truncate text-[11px] leading-4 text-muted">{active ? `${active.label} · ${PERCENT.format((active.value / total) * 100)}%` : centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="min-w-[160px] flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.key}>
            <button
              className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-[13px] transition-colors", onSelect ? "cursor-pointer hover:bg-surface-1" : "cursor-default", hover === segment.key && "bg-surface-1")}
              onClick={onSelect ? () => onSelect(segment) : undefined}
              onMouseEnter={() => setHover(segment.key)}
              onMouseLeave={() => setHover(null)}
              type="button"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: segment.color }} />
              <span className="min-w-0 flex-1 truncate text-text-secondary">{segment.label}</span>
              <span className="font-semibold tabular-nums text-foreground">{viNumber.format(segment.value)}</span>
              <span className="w-12 text-right text-xs tabular-nums text-muted">{PERCENT.format((segment.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Pyramid

export type PyramidRow = { key: string; label: string; left: number; right: number };

type PyramidProps = {
  rows: PyramidRow[];
  leftLabel: string;
  rightLabel: string;
  leftColor?: string;
  rightColor?: string;
  onSelect?: (row: PyramidRow, side: "left" | "right") => void;
  ariaLabel: string;
};

/** Tháp dân số: hai nửa đối xứng quanh trục giữa, cùng một thang cho cả hai bên nên so sánh trực tiếp được. Từ trên xuống: nhóm tuổi trẻ → lớn. */
export function PyramidChart({ rows, leftLabel, rightLabel, leftColor = "var(--viz-1)", rightColor = "var(--viz-2)", onSelect, ariaLabel }: PyramidProps) {
  const max = Math.max(...rows.flatMap((row) => [row.left, row.right]), 1);
  return (
    <div aria-label={ariaLabel} role="group">
      <div className="mb-2 grid grid-cols-[1fr_72px_1fr] items-center text-xs font-medium text-text-secondary">
        <span className="inline-flex items-center justify-end gap-1.5">
          {leftLabel}
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: leftColor }} />
        </span>
        <span />
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: rightColor }} />
          {rightLabel}
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((row, index) => (
          <li className="grid grid-cols-[1fr_72px_1fr] items-center gap-0" key={row.key}>
            <button className="group/side flex h-6 cursor-pointer items-center justify-end gap-2" disabled={!onSelect} onClick={() => onSelect?.(row, "left")} type="button">
              <span className="text-xs font-semibold tabular-nums text-foreground">{row.left > 0 ? viNumber.format(row.left) : ""}</span>
              <span className="analytics-grow-end block h-4 rounded-l-[4px] transition-[filter] group-hover/side:brightness-110" style={{ width: `${(row.left / max) * 70}%`, minWidth: row.left > 0 ? 3 : 0, background: leftColor, animationDelay: `${index * 60}ms` }} />
            </button>
            <span className="text-center text-[11px] font-medium text-muted">{row.label}</span>
            <button className="group/side flex h-6 cursor-pointer items-center gap-2" disabled={!onSelect} onClick={() => onSelect?.(row, "right")} type="button">
              <span className="analytics-grow block h-4 rounded-r-[4px] transition-[filter] group-hover/side:brightness-110" style={{ width: `${(row.right / max) * 70}%`, minWidth: row.right > 0 ? 3 : 0, background: rightColor, animationDelay: `${index * 60}ms` }} />
              <span className="text-xs font-semibold tabular-nums text-foreground">{row.right > 0 ? viNumber.format(row.right) : ""}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------- Column

export type ColumnItem = { key: string; label: string; value: number; color?: string };

type ColumnProps = {
  items: ColumnItem[];
  color?: string;
  height?: number;
  onSelect?: (item: ColumnItem) => void;
  ariaLabel: string;
  /** Giá trị chuẩn vẽ thành vạch ngang (vd. điểm đạt). */
  marker?: { index: number; label: string };
};

/** Cột đứng cho phân bố (histogram): cột ≤ 28px, bo đầu 4px, mọc từ đường nền khi vào viewport; số liệu hiện ở đầu cột có giá trị. */
export function ColumnChart({ items, color = "var(--viz-1)", height = 160, onSelect, ariaLabel, marker }: ColumnProps) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div aria-label={ariaLabel} role="group">
      <div className="relative flex items-end gap-1.5 border-b border-[var(--viz-axis)] px-1" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((line) => (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-[var(--viz-grid)]" key={line} style={{ bottom: `${line * 100}%` }} />
        ))}
        {items.map((item, index) => {
          const barHeight = (item.value / max) * (height - 22);
          const isMarker = marker?.index === index;
          return (
            <button
              aria-label={`${item.label}: ${viNumber.format(item.value)}`}
              className={cn("group/col relative z-10 flex h-full flex-1 flex-col items-center justify-end", onSelect ? "cursor-pointer" : "cursor-default")}
              disabled={!onSelect}
              key={item.key}
              onClick={() => onSelect?.(item)}
              title={`${item.label}: ${viNumber.format(item.value)}`}
              type="button"
            >
              {item.value > 0 ? <span className="mb-1 text-[11px] font-semibold tabular-nums text-foreground">{viNumber.format(item.value)}</span> : null}
              <span
                className="analytics-grow-y block w-full max-w-[28px] rounded-t-[4px] transition-[filter,transform] duration-200 group-hover/col:brightness-110"
                style={{ height: Math.max(barHeight, item.value > 0 ? 3 : 0), background: `linear-gradient(180deg, ${item.color ?? color}, color-mix(in srgb, ${item.color ?? color} 62%, white))`, animationDelay: `${index * 45}ms` }}
              />
              {isMarker ? <span aria-hidden className="absolute inset-y-0 left-1/2 border-l-2 border-[var(--viz-critical)]/70" /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 px-1">
        {items.map((item) => (
          <span className="flex-1 text-center text-[11px] tabular-nums text-muted" key={item.key}>
            {item.label}
          </span>
        ))}
      </div>
      {marker ? <p className="mt-2 text-[11px] text-muted"><span className="mr-1 inline-block h-2 w-0.5 bg-[var(--viz-critical)]/70 align-middle" />{marker.label}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------- Heatmap

export type HeatRow = { key: string; label: string; cells: number[]; total: number };

type HeatmapProps = {
  rows: HeatRow[];
  columns: string[];
  columnLabel: (column: string) => string;
  ariaLabel: string;
  onSelect?: (row: HeatRow) => void;
  hue?: string;
};

/** Bản đồ nhiệt đơn vị × kỳ: một màu đậm dần theo giá trị (thang tuần tự), ô hiện số khi đủ rộng; ô xuất hiện lan từ góc trên trái. */
export function Heatmap({ rows, columns, columnLabel, ariaLabel, onSelect, hue = "var(--viz-1)" }: HeatmapProps) {
  const max = Math.max(...rows.flatMap((row) => row.cells), 1);
  const showValues = columns.length <= 14;
  return (
    <div className="overflow-x-auto" role="group" aria-label={ariaLabel}>
      <div className="w-max min-w-full">
        <div className="grid items-center gap-x-1 gap-y-1.5" style={{ gridTemplateColumns: `minmax(150px, max-content) repeat(${columns.length}, minmax(26px, 40px)) 40px` }}>
          <span />
          {columns.map((column) => (
            <span className="text-center text-[10px] leading-4 text-muted" key={column}>
              {columnLabel(column)}
            </span>
          ))}
          <span className="text-right text-[10px] text-muted">Tổng</span>
          {rows.map((row, rowIndex) => (
            <HeatLine hue={hue} key={row.key} max={max} onSelect={onSelect} row={row} rowIndex={rowIndex} showValues={showValues} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted">
        Ít
        <span aria-hidden className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${hue} 8%, white), ${hue})` }} />
        Nhiều
      </div>
    </div>
  );
}

function HeatLine({ row, rowIndex, max, hue, showValues, onSelect }: { row: HeatRow; rowIndex: number; max: number; hue: string; showValues: boolean; onSelect?: (row: HeatRow) => void }) {
  return (
    <>
      <button className={cn("break-words pr-3 text-left text-xs leading-4 text-foreground", onSelect ? "cursor-pointer hover:text-primary" : "cursor-default")} disabled={!onSelect} onClick={() => onSelect?.(row)} title={row.label} type="button">
        {row.label}
      </button>
      {row.cells.map((value, columnIndex) => {
        const intensity = value / max;
        return (
          <span
            className="analytics-cell grid h-6 place-items-center rounded text-[10px] font-semibold tabular-nums transition-transform duration-150 hover:scale-110"
            key={columnIndex}
            style={{
              background: value === 0 ? "var(--surface-2)" : `color-mix(in srgb, ${hue} ${Math.round(12 + intensity * 88)}%, white)`,
              color: intensity > 0.5 ? "#fff" : "var(--viz-ink-2)",
              animationDelay: `${(rowIndex + columnIndex) * 30}ms`,
            }}
            title={`${row.label}: ${viNumber.format(value)}`}
          >
            {showValues && value > 0 ? viNumber.format(value) : ""}
          </span>
        );
      })}
      <span className="text-right text-[11px] font-semibold tabular-nums text-foreground">{viNumber.format(row.total)}</span>
    </>
  );
}

// ------------------------------------------------------------------ Gauge

type GaugeProps = { value: number | null; label: string; color: string; hint?: string; size?: number };

/** Đồng hồ vòng cho một tỷ lệ 0–100: cung quét từ 0 tới giá trị khi vào viewport; null (chưa có mẫu số) hiện gạch ngang thay vì 0%. */
export function RadialGauge({ value, label, color, hint, size = 108 }: GaugeProps) {
  const thickness = 10;
  const radius = (size - thickness) / 2;
  const clamped = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg aria-hidden className="-rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="color-mix(in srgb, currentColor 0%, var(--surface-2))" strokeWidth={thickness} />
          <circle
            className="analytics-sweep"
            cx={size / 2}
            cy={size / 2}
            fill="none"
            pathLength={100}
            r={radius}
            stroke={color}
            strokeLinecap="round"
            strokeWidth={thickness}
            style={{ ["--dash" as string]: clamped } as React.CSSProperties}
            strokeDasharray={`${clamped} 100`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-xl font-bold tabular-nums text-foreground">{value === null ? "—" : `${PERCENT.format(value)}%`}</span>
        </div>
      </div>
      <p className="mt-2 text-[13px] font-medium text-foreground">{label}</p>
      {hint ? <p className="text-[11px] text-muted tabular-nums">{hint}</p> : null}
    </div>
  );
}
