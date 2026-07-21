"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { ChartFrame, ChartSkeleton } from "@/modules/analytics/components/chart-frame";
import { AnimatedMetric } from "@/modules/analytics/components/animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "@/modules/analytics/types";
import { Header } from "@/modules/dashboard/components/dashboard-view";

const tabs = [
  ["organization", "Tổ chức", "Giáo phận, giáo hạt, giáo xứ theo scope"],
  ["leaders", "Huynh trưởng", "Giới tính, tuổi, cấp bậc, trạng thái"],
  ["courses", "Khóa huấn luyện", "Đăng ký, tham dự, hoàn thành, đạt"],
  ["certificates", "Chứng nhận", "Duyệt, ngoại lệ, chuyển đổi và thời gian xử lý"],
] as const;

export function AnalyticsView() {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("organization");
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", timeBucket: "MONTH", groupBy: "" });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);
  const query = useQuery({
    queryKey: ["analytics", tab, queryString],
    queryFn: () => apiFetch<AnalyticsResponse>(`/analytics/${tab}${queryString ? `?${queryString}` : ""}`),
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
    <div className="space-y-5">
      <Header eyebrow="analytics" title="Phân tích" subtitle="Các biểu đồ dùng dữ liệu cấu trúc từ backend, có filter ngày, bucket và groupBy thật." />
      <Panel className="p-2">
        <div className="grid gap-2 lg:grid-cols-4">
          {tabs.map(([value, label, description]) => (
            <button
              className={["cursor-pointer rounded-[10px] border p-3 text-left transition-colors", tab === value ? "border-primary bg-primary text-white shadow-[var(--shadow-accent)]" : "border-transparent text-foreground hover:bg-primary-soft hover:text-primary"].join(" ")}
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

      <Panel className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label>
            <span className="mb-2 block text-xs font-semibold text-foreground">Từ ngày</span>
            <Input type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold text-foreground">Đến ngày</span>
            <Input type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold text-foreground">Bucket</span>
            <select className="h-11 w-full rounded-[8px] border border-border bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]" value={filters.timeBucket} onChange={(event) => setFilters((current) => ({ ...current, timeBucket: event.target.value }))}>
              <option value="MONTH">MONTH</option>
              <option value="QUARTER">QUARTER</option>
              <option value="YEAR">YEAR</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold text-foreground">Group by</span>
            <Input placeholder="VD: courseType" value={filters.groupBy} onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value }))} />
          </label>
        </div>
      </Panel>

      <div>
        <h2 className="text-lg font-semibold">{currentTab?.[1]}</h2>
        <p className="mt-1 text-sm text-muted">{currentTab?.[2]}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {toKpiList(query.data)
          .slice(0, 8)
          .map((metric, index) => (
            <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
          ))}
        {query.isLoading ? Array.from({ length: 4 }).map((_, index) => <div className="h-[132px] rounded-[12px] bg-white motion-safe:animate-pulse" key={index} />) : null}
      </section>

      {query.isLoading ? <ChartSkeleton /> : <ChartFrame description="Animation chạy khi chart vào viewport và tắt khi reduced motion." metricKeys={metricKeys} rows={rows} title="So sánh theo kỳ" type="bar" />}
    </div>
  );
}
