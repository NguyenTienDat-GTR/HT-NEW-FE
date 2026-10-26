"use client";

import { useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LegendItem } from "@/modules/analytics/components/charts";
import { EmptyState, SkeletonBlock, useRevealed } from "@/modules/analytics/components/section-card";
import { cn, viNumber } from "@/lib/utils";
import { formatPeriod } from "@/modules/analytics/period";

export type TrendSeries = { key: string; label: string; color: string };

type Row = Record<string, string | number | null>;

type TrendChartProps = {
  rows: Row[];
  series: TrendSeries[];
  /** Có `prev:<key>` trong rows thì vẽ thêm đường kỳ trước của series đầu tiên đang bật. */
  showPrevious?: boolean;
  variant?: "line" | "area" | "stackedBar";
  height?: number;
  ariaLabel: string;
};

function compact(value: number) {
  return value >= 1000 ? `${viNumber.format(Math.round(value / 100) / 10)}K` : viNumber.format(value);
}

type TooltipProps = { active?: boolean; label?: string; payload?: { payload: Row }[]; series: TrendSeries[]; hidden: Set<string>; showPrevious: boolean };

function TrendTooltip({ active, payload, series, hidden, showPrevious }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const visible = series.filter((item) => !hidden.has(item.key));
  const previousPeriod = typeof row.previousPeriod === "string" ? row.previousPeriod : null;
  return (
    <div className="min-w-[180px] rounded-lg border border-border bg-white px-3 py-2.5 text-sm shadow-[var(--shadow-elevated)]">
      <p className="text-xs font-medium text-muted">{formatPeriod(String(row.period))}</p>
      <ul className="mt-1.5 space-y-1">
        {visible.map((item) => (
          <li className="flex items-center justify-between gap-6" key={item.key}>
            <span className="inline-flex items-center gap-2 text-text-secondary">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{viNumber.format(Number(row[item.key] ?? 0))}</span>
          </li>
        ))}
      </ul>
      {showPrevious && previousPeriod && visible[0] ? (
        <p className="mt-2 flex items-center justify-between gap-6 border-t border-border pt-2 text-xs text-muted">
          <span>Kỳ trước ({formatPeriod(previousPeriod)})</span>
          <span className="font-semibold tabular-nums text-text-secondary">{viNumber.format(Number(row[`prev:${visible[0].key}`] ?? 0))}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Biểu đồ xu hướng nhiều chuỗi: một tooltip liệt kê mọi chuỗi tại kỳ gần con trỏ, chú giải bấm để ẩn/hiện, có bảng dữ liệu thay thế. */
export function TrendChart({ rows, series, showPrevious = false, variant = "line", height = 300, ariaLabel }: TrendChartProps) {
  const revealed = useRevealed();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [table, setTable] = useState(false);
  const active = series.filter((item) => !hidden.has(item.key));
  const hasPrevious = showPrevious && rows.some((row) => row.previousPeriod !== undefined);
  const hasData = useMemo(() => rows.some((row) => series.some((item) => Number(row[item.key] ?? 0) > 0)), [rows, series]);

  if (!rows.length || !hasData) return <EmptyState />;
  // Chưa cuộn tới thì chưa dựng biểu đồ: animation vẽ đường chạy đúng lúc người xem nhìn thấy.
  if (!revealed) return <SkeletonBlock className="w-full" style={{ height: height + 40 }} />;

  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else if (active.length > 1) next.add(key);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {series.length > 1 || hasPrevious
          ? series.map((item) => (
              <button
                aria-pressed={!hidden.has(item.key)}
                className={cn("inline-flex cursor-pointer items-center rounded-md px-1.5 py-0.5 transition-opacity hover:bg-surface-1", hidden.has(item.key) && "opacity-40")}
                key={item.key}
                onClick={() => toggle(item.key)}
                type="button"
              >
                <LegendItem color={item.color} label={item.label} />
              </button>
            ))
          : null}
        {hasPrevious ? <LegendItem color="var(--viz-axis)" dashed label={`Kỳ trước (${active[0]?.label ?? ""})`} /> : null}
        <button className="ml-auto cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-1 hover:text-primary" onClick={() => setTable((value) => !value)} type="button">
          {table ? "Xem biểu đồ" : "Xem bảng dữ liệu"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[320px] overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="sticky top-0 bg-surface-1 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Kỳ</th>
                {series.map((item) => (
                  <th className="px-3 py-2 text-right font-semibold" key={item.key}>
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-border" key={String(row.period)}>
                  <td className="px-3 py-2">{formatPeriod(String(row.period))}</td>
                  {series.map((item) => (
                    <td className="px-3 py-2 text-right tabular-nums" key={item.key}>
                      {viNumber.format(Number(row[item.key] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div aria-label={ariaLabel} className="h-(--trend-h) sm:h-(--trend-h-lg)" role="img" style={{ "--trend-h": `${Math.round(height * 0.75)}px`, "--trend-h-lg": `${height}px` } as React.CSSProperties}>
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                {series.map((item) => (
                  <linearGradient id={`fill-${item.key}`} key={item.key} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={item.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--viz-grid)" strokeWidth={1} vertical={false} />
              <XAxis axisLine={{ stroke: "var(--viz-axis)" }} dataKey="period" interval="preserveStartEnd" minTickGap={24} tick={{ fill: "var(--viz-muted)", fontSize: 12 }} tickFormatter={formatPeriod} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--viz-muted)", fontSize: 12 }} tickFormatter={compact} tickLine={false} width={44} />
              <Tooltip content={<TrendTooltip hidden={hidden} series={series} showPrevious={hasPrevious} />} cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }} isAnimationActive={false} />
              {variant === "stackedBar"
                ? active.map((item, index) => (
                    <Bar animationDuration={600} barSize={24} dataKey={item.key} fill={item.color} key={item.key} radius={index === active.length - 1 ? [4, 4, 0, 0] : 0} stackId="s" stroke="#fff" strokeWidth={0} />
                  ))
                : null}
              {variant !== "stackedBar" && hasPrevious && active[0] ? (
                <Line animationDuration={600} dataKey={`prev:${active[0].key}`} dot={false} isAnimationActive={false} stroke="var(--viz-axis)" strokeDasharray="4 3" strokeLinecap="round" strokeWidth={2} type="monotone" />
              ) : null}
              {variant !== "stackedBar"
                ? active.map((item) => <Area animationDuration={900} dataKey={item.key} fill={`url(#fill-${item.key})`} isAnimationActive key={`area-${item.key}`} stroke="none" type="monotone" />)
                : null}
              {variant !== "stackedBar"
                ? active.map((item) => (
                    <Line
                      activeDot={{ r: 4, fill: item.color, stroke: "#fff", strokeWidth: 2 }}
                      animationDuration={700}
                      animationEasing="ease-out"
                      dataKey={item.key}
                      dot={rows.length <= 14 ? { r: 3.5, fill: item.color, stroke: "#fff", strokeWidth: 2 } : false}
                      key={item.key}
                      stroke={item.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      type="monotone"
                    />
                  ))
                : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
