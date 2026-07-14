"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { ChartFrame, ChartSkeleton } from "./chart-frame";
import { Header } from "./dashboard-view";
import { AnimatedMetric } from "./animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "./types";

const tabs = [
  ["organization", "Tổ chức", "Giáo phận, giáo hạt, giáo xứ theo scope"],
  ["leaders", "Huynh trưởng", "Giới tính, tuổi, cấp bậc, trạng thái"],
  ["courses", "Khóa huấn luyện", "Đăng ký, tham dự, hoàn thành, đạt"],
  ["certificates", "Chứng nhận", "Duyệt, ngoại lệ, chuyển đổi và thời gian xử lý"],
] as const;

export function AnalyticsView() {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("organization");
  const query = useQuery({
    queryKey: ["analytics", tab],
    queryFn: () => apiFetch<AnalyticsResponse>(`/analytics/${tab}`),
  });
  const rows = toChartRows(query.data);
  const metricKeys = useMemo(
    () =>
      Object.keys(rows[0] ?? {})
        .filter((key) => key !== "period")
        .slice(0, 4),
    [rows],
  );
  const currentTab = tabs.find(([value]) => value === tab);

  return (
    <div className="space-y-6">
      <Header eyebrow="analytics" title="Phân tích" subtitle="Các biểu đồ dùng dữ liệu cấu trúc từ backend, FE tự map label theo type/key/metric." />
      <Panel className="p-2">
        <div className="grid gap-2 lg:grid-cols-4">
          {tabs.map(([value, label, description]) => (
            <button
              className={[
                "rounded-[10px] border p-3 text-left transition-colors",
                tab === value ? "border-primary bg-primary text-white" : "border-transparent text-foreground hover:bg-surface-1",
              ].join(" ")}
              key={value}
              onClick={() => setTab(value)}
              type="button"
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className={tab === value ? "mt-1 block text-xs text-white/80" : "mt-1 block text-xs text-muted"}>{description}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{currentTab?.[1]}</h2>
          <p className="mt-1 text-sm text-muted">{currentTab?.[2]}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Tháng</Button>
          <Button variant="outline">Quý</Button>
          <Button variant="outline">Năm</Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {toKpiList(query.data)
          .slice(0, 8)
          .map((metric, index) => (
            <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
          ))}
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <div className="h-[132px] rounded-[12px] bg-white motion-safe:animate-pulse" key={index} />)
          : null}
      </section>

      {query.isLoading ? (
        <ChartSkeleton />
      ) : (
        <ChartFrame
          description="Animation chạy khi chart vào viewport và tắt khi reduced motion."
          metricKeys={metricKeys}
          rows={rows}
          title="So sánh theo kỳ"
          type="bar"
        />
      )}
    </div>
  );
}
