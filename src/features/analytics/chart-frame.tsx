"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/ui/panel";
import { cn, viNumber } from "@/lib/utils";

type ChartFrameProps = {
  title: string;
  description: string;
  rows: Record<string, unknown>[];
  metricKeys: string[];
  type?: "area" | "bar";
};

export function ChartFrame({ title, description, rows, metricKeys, type = "area" }: ChartFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reducedMotion = useReducedMotion();
  const animate = Boolean(inView && !reducedMotion);

  if (!rows.length || !metricKeys.length) return <ChartEmpty title={title} description={description} />;

  return (
    <Panel ref={ref} className="p-4">
      <ChartHeader title={title} description={description} />
      <div className="mt-4 h-[320px]">
        <ResponsiveContainer height="100%" width="100%">
          {type === "bar" ? (
            <BarChart data={rows}>
              <CartesianGrid stroke="#EFEFF1" vertical={false} />
              <XAxis dataKey="period" tickLine={false} />
              <YAxis tickFormatter={(value) => viNumber.format(Number(value))} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} />
              {metricKeys.map((key, index) => (
                <Bar
                  animationDuration={animate ? 700 : 0}
                  animationEasing="ease-out"
                  dataKey={key}
                  fill={palette[index % palette.length]}
                  isAnimationActive={animate}
                  key={key}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={rows}>
              <CartesianGrid stroke="#EFEFF1" vertical={false} />
              <XAxis dataKey="period" tickLine={false} />
              <YAxis tickFormatter={(value) => viNumber.format(Number(value))} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} />
              {metricKeys.map((key, index) => (
                <Area
                  animationDuration={animate ? 700 : 0}
                  animationEasing="ease-out"
                  dataKey={key}
                  fill={palette[index % palette.length]}
                  fillOpacity={0.12}
                  isAnimationActive={animate}
                  key={key}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <ChartLegend keys={metricKeys} />
      <ChartDataTable rows={rows} metricKeys={metricKeys} />
    </Panel>
  );
}

export function ChartHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function ChartLegend({ keys }: { keys: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {keys.map((key, index) => (
        <span className="inline-flex items-center gap-2 text-xs text-muted" key={key}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[index % palette.length] }} />
          {key}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      className="rounded-[8px] border border-border bg-white px-3 py-2 text-sm shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16 }}
    >
      <p className="font-semibold">{label}</p>
      {payload.map((item) => (
        <p className="mt-1 text-muted" key={item.name}>
          <span className="font-medium" style={{ color: item.color }}>
            {item.name}
          </span>
          : {viNumber.format(Number(item.value))}
        </p>
      ))}
    </motion.div>
  );
}

export function ChartDataTable({ rows, metricKeys }: { rows: Record<string, unknown>[]; metricKeys: string[] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-muted">Bảng dữ liệu biểu đồ</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="border-b border-border py-2 font-semibold">Kỳ</th>
              {metricKeys.map((key) => (
                <th className="border-b border-border py-2 font-semibold" key={key}>
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.period)}>
                <td className="border-b border-surface-2 py-2">{String(row.period)}</td>
                {metricKeys.map((key) => (
                  <td className="border-b border-surface-2 py-2" key={key}>
                    {viNumber.format(Number(row[key] ?? 0))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function ChartSkeleton() {
  return <Panel className="h-[420px] p-4 motion-safe:animate-pulse" />;
}

export function ChartEmpty({ title, description, className }: { title: string; description: string; className?: string }) {
  return (
    <Panel className={cn("grid min-h-[320px] place-items-center p-6 text-center", className)}>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
    </Panel>
  );
}

export function ChartError() {
  return <ChartEmpty title="Không tải được biểu đồ" description="Vui lòng thử lại hoặc kiểm tra quyền truy cập." />;
}

const palette = ["#6C47FF", "#4F46E5", "#8B5CF6", "#A78BFA"];
