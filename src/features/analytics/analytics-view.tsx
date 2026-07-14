"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { ChartFrame, ChartSkeleton } from "./chart-frame";
import { Header } from "./dashboard-view";
import { AnimatedMetric } from "./animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "./types";

const tabs = [
  ["organization", "Tổ chức"],
  ["leaders", "Huynh trưởng"],
  ["courses", "Khóa học"],
  ["certificates", "Chứng chỉ"],
] as const;

export function AnalyticsView() {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("organization");
  const query = useQuery({
    queryKey: ["analytics", tab],
    queryFn: () => apiFetch<AnalyticsResponse>(`/analytics/${tab}`),
  });
  const rows = toChartRows(query.data);
  const metricKeys = useMemo(() => Object.keys(rows[0] ?? {}).filter((key) => key !== "period").slice(0, 4), [rows]);

  return (
    <div className="space-y-6">
      <Header title="Phân tích" subtitle="Breakdown, trend và comparison theo từng miền dữ liệu." />
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <Button key={value} onClick={() => setTab(value)} variant={tab === value ? "primary" : "outline"}>
            {label}
          </Button>
        ))}
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {toKpiList(query.data).slice(0, 8).map((metric, index) => (
          <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
        ))}
      </section>
      {query.isLoading ? (
        <ChartSkeleton />
      ) : (
        <ChartFrame description="Animation chạy khi chart vào viewport và tắt khi reduced motion." metricKeys={metricKeys} rows={rows} title="So sánh theo kỳ" type="bar" />
      )}
    </div>
  );
}
