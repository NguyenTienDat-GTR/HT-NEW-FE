"use client";

import { CaretDown, CaretUp, Info, Minus } from "@phosphor-icons/react";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { kpiVisual } from "@/modules/analytics/kpi-visuals";
import { formatKpiValue, kpiMeta, snapshotKpis } from "@/modules/analytics/labels";
import type { Kpi, KpiUnit, SparkPoint } from "@/modules/analytics/types";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Đếm số bằng cách ghi thẳng vào DOM: không re-render React nên mượt kể cả khi nhiều thẻ cùng chạy. */
export function CountUp({ value, unit }: { value: number | null | undefined; unit: KpiUnit }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reduced = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (value === null || value === undefined || reduced) {
      node.textContent = formatKpiValue(value, unit);
      shown.current = value ?? 0;
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        shown.current = latest;
        node.textContent = formatKpiValue(latest, unit);
      },
    });
    return () => controls.stop();
  }, [value, unit, reduced]);

  return (
    <span ref={ref} suppressHydrationWarning>
      {formatKpiValue(value, unit)}
    </span>
  );
}

type Tone = "good" | "bad" | "neutral";

/** Hướng thay đổi × việc tăng có phải điều tốt: màu luôn đi kèm mũi tên và dấu, không dựa vào màu đơn lẻ. */
export function deltaTone(delta: number, upIsGood?: boolean): Tone {
  if (delta === 0 || upIsGood === undefined) return "neutral";
  return delta > 0 === upIsGood ? "good" : "bad";
}

export function formatDelta(kpi: Pick<Kpi, "unit" | "delta" | "deltaPct">) {
  const { unit, delta, deltaPct } = kpi;
  if (delta === null || delta === undefined) return null;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const abs = Math.abs(delta);
  if (unit === "PERCENT") return `${sign}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(abs)} điểm`;
  if (deltaPct !== null && deltaPct !== undefined) return `${sign}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(Math.abs(deltaPct))}%`;
  return `${sign}${formatKpiValue(abs, unit)}`;
}

export function DeltaBadge({ kpi, upIsGood, compact }: { kpi: Kpi; upIsGood?: boolean; compact?: boolean }) {
  const text = formatDelta(kpi);
  if (text === null || kpi.delta === null || kpi.delta === undefined) {
    return <span className="text-[11px] text-muted">{compact ? "Chưa có kỳ trước" : "Chưa có kỳ trước để so sánh"}</span>;
  }
  const tone = deltaTone(kpi.delta, upIsGood);
  const Icon = kpi.delta > 0 ? CaretUp : kpi.delta < 0 ? CaretDown : Minus;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" title="So với kỳ liền trước cùng độ dài">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
          tone === "good" && "bg-[#e8f5e8] text-[var(--viz-delta-good)]",
          tone === "bad" && "bg-[#fdecec] text-[var(--viz-delta-bad)]",
          tone === "neutral" && "bg-surface-2 text-text-secondary",
        )}
      >
        <Icon className="h-3 w-3" weight="bold" />
        {text}
      </span>
      {compact ? null : <span className="text-muted">so với kỳ trước</span>}
    </span>
  );
}

/** Đường xu hướng 12 điểm; kỳ không có dữ liệu (null) làm đứt đường thay vì rơi về 0. */
export function Sparkline({ points, color = "var(--viz-1)" }: { points: SparkPoint[]; color?: string }) {
  if (points.length < 2) return null;
  const width = 100;
  const height = 32;
  const pad = 4;
  const values = points.map((point) => point.value).filter((value): value is number => value !== null);
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index: number) => pad + (index / (points.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);

  // Mỗi đoạn liên tục (không có kỳ null) vẽ một đường và một vùng tô nhạt.
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push({ x: x(index), y: y(point.value) });
  });
  if (run.length) runs.push(run);
  const line = (items: { x: number; y: number }[]) => items.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(2)} ${item.y.toFixed(2)}`).join("");
  const area = (items: { x: number; y: number }[]) => `${line(items)}L${items[items.length - 1].x.toFixed(2)} ${height - pad}L${items[0].x.toFixed(2)} ${height - pad}Z`;
  const end = runs[runs.length - 1][runs[runs.length - 1].length - 1];

  return (
    <svg aria-hidden className="hidden h-6 w-[60px] shrink-0 overflow-visible sm:block" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {runs.map((items) => (
        <g key={items[0].x}>
          {items.length > 1 ? <path d={area(items)} fill={color} opacity={0.1} /> : null}
          <path className="analytics-draw" d={line(items)} fill="none" pathLength={1} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      <circle className="analytics-pop" cx={end.x} cy={end.y} fill={color} r={3.5} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

export function InfoHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex">
      <button aria-label={text} className="grid h-5 w-5 cursor-help place-items-center rounded-full text-muted transition-colors hover:text-primary focus-visible:text-primary" type="button">
        <Info className="h-3.5 w-3.5" weight="bold" />
      </button>
      <span
        className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 w-64 max-w-[min(16rem,80vw)] translate-y-1 rounded-lg border border-border bg-white p-2.5 text-left text-xs font-normal leading-5 text-text-secondary opacity-0 shadow-[var(--shadow-elevated)] transition duration-150 group-hover/hint:translate-y-0 group-hover/hint:opacity-100 group-focus-within/hint:translate-y-0 group-focus-within/hint:opacity-100"
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}

type KpiCardProps = {
  kpi: Kpi;
  index?: number;
  /** Ghi đè nhãn của kpiMeta. */
  label?: string;
  color?: string;
  onClick?: () => void;
  busy?: boolean;
  /** Người xem đang bật so sánh kỳ trước; tắt thì không hiện dòng so sánh. */
  compare?: boolean;
};

/**
 * Thẻ KPI gọn: biểu tượng màu theo chỉ số, số 20px, sparkline nhỏ; hover nâng nhẹ và rọi màu của chính chỉ số đó.
 * Số liệu và sparkline nằm một hàng, dòng so sánh / tử số-mẫu số nằm hàng dưới chiếm trọn chiều ngang thẻ,
 * nên thẻ tỷ lệ (có "điểm" so với kỳ trước, "x / y") không bị co lệch so với thẻ đếm số.
 */
export function KpiCard({ kpi, index = 0, label, onClick, busy, compare = true }: KpiCardProps) {
  const meta = kpiMeta[kpi.key];
  const reduced = useReducedMotion();
  const { icon: Icon, tone } = kpiVisual(kpi.key);
  const title = label ?? meta?.label ?? kpi.key;
  const Wrapper = onClick ? motion.button : motion.div;
  return (
    <Wrapper
      animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "group/kpi relative flex min-h-[84px] flex-col justify-between rounded-xl border border-border bg-white p-2.5 sm:min-h-[96px] sm:p-3.5 text-left shadow-sm transition-[transform,box-shadow,border-color,opacity] duration-200 hover:-translate-y-0.5 hover:z-20 hover:shadow-[var(--shadow-elevated)] focus-within:z-20",
        onClick && "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        busy && "opacity-60",
      )}
      initial={reduced ? false : { opacity: 0, y: 14, scale: 0.96 }}
      onClick={onClick}
      transition={{ delay: Math.min(index, 10) * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      type={onClick ? "button" : undefined}
    >
      {/* Phần trang trí cắt theo góc bo của thẻ; thẻ không cắt nội dung để tooltip hiện đè ra ngoài. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-[0.28] transition-transform duration-500 ease-out group-hover/kpi:scale-x-100" style={{ background: tone }} />
        <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.09] transition-opacity duration-300 group-hover/kpi:opacity-[0.18]" style={{ background: tone }} />
      </span>
      <div className="relative flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg sm:h-7 sm:w-7" style={{ background: `color-mix(in srgb, ${tone} 14%, white)`, color: tone }}>
          <Icon className="h-4 w-4" weight="bold" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-text-secondary sm:text-xs">{title}</p>
        {meta?.hint ? <InfoHint text={meta.hint} /> : null}
      </div>
      <div className="relative mt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-lg font-bold leading-6 sm:text-xl tracking-[-0.01em] tabular-nums text-foreground">
            <CountUp unit={kpi.unit} value={kpi.value} />
            {meta?.unitLabel && kpi.value !== null ? <span className="ml-1 text-xs font-medium text-muted">{meta.unitLabel}</span> : null}
          </p>
          {kpi.sparkline?.length ? <Sparkline color={tone} points={kpi.sparkline} /> : null}
        </div>
        <div className="mt-1 flex min-h-5 items-center">
          {snapshotKpis.has(kpi.key) ? (
            <span className="text-[11px] text-muted">{kpi.unit === "PERCENT" && kpi.denominator ? `${new Intl.NumberFormat("vi-VN").format(kpi.numerator ?? 0)} / ${new Intl.NumberFormat("vi-VN").format(kpi.denominator)}` : "Hiện tại"}</span>
          ) : compare ? (
            <DeltaBadge compact kpi={kpi} upIsGood={meta?.upIsGood} />
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}
