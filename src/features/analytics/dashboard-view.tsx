"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartFrame, ChartSkeleton } from "./chart-frame";
import { AnimatedMetric } from "./animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "./types";
import { apiFetch } from "@/lib/api/client";

export function DashboardView() {
  const query = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => apiFetch<AnalyticsResponse>("/analytics/overview"),
  });
  const rows = toChartRows(query.data);
  const metricKeys = Object.keys(rows[0] ?? {}).filter((key) => key !== "period").slice(0, 3);

  return (
    <div className="space-y-6">
      <Header title="Tổng quan" subtitle="Chỉ hiển thị số liệu thật từ backend theo scope hiện tại." />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {toKpiList(query.data).map((metric, index) => (
          <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
        ))}
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <div className="h-[132px] rounded-[12px] bg-white motion-safe:animate-pulse" key={index} />)
          : null}
      </section>
      {query.isLoading ? (
        <ChartSkeleton />
      ) : (
        <ChartFrame description="Trend và comparison dùng response analytics thật." metricKeys={metricKeys} rows={rows} title="Xu hướng tổng quan" />
      )}
    </div>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[0] text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}
