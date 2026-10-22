"use client";

import { SlidersHorizontal } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { ChartFrame, ChartSkeleton } from "@/modules/analytics/components/chart-frame";
import { AnimatedMetric } from "@/modules/analytics/components/animated-metric";
import { buildAnalyticsQuery, metricLabel, toChartRows, toKpiList, type AnalyticsFilterState, type AnalyticsResponse } from "@/modules/analytics/types";
import { Header } from "@/modules/dashboard/components/dashboard-view";
import { useSessionState } from "@/lib/use-session-state";

const tabs = [
  ["organization", "Tổ chức", "Giáo phận, giáo hạt, giáo xứ theo scope"],
  ["leaders", "Huynh trưởng", "Giới tính, tuổi, cấp bậc, trạng thái"],
  ["courses", "Khóa huấn luyện", "Đăng ký, tham dự, hoàn thành, đạt"],
  ["certificates", "Chứng nhận", "Duyệt, ngoại lệ, chuyển đổi và thời gian xử lý"],
] as const;

export function AnalyticsView() {
  const [tab, setTab] = useSessionState<(typeof tabs)[number][0]>("analytics:tab", "organization");
  const [filters, setFilters] = useSessionState<AnalyticsFilterState>("analytics:filters", { fromDate: "", toDate: "", timeBucket: "MONTH", groupBy: "", includeInactiveUnits: false });
  const queryString = useMemo(() => buildAnalyticsQuery(filters), [filters]);
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
    <div className="space-y-6">
      <Header eyebrow="analytics" title="Phân tích" subtitle="Các biểu đồ dùng dữ liệu cấu trúc từ backend, có filter ngày, bucket và groupBy thật." />
      <Panel className="p-2">
        <div className="grid gap-2 lg:grid-cols-4">
          {tabs.map(([value, label, description]) => (
            <button
              className={["cursor-pointer rounded-lg border p-3 text-left transition-colors", tab === value ? "border-primary bg-primary-soft text-primary" : "border-transparent text-foreground hover:bg-primary-soft hover:text-primary"].join(" ")}
              key={value}
              onClick={() => setTab(value)}
              type="button"
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className={tab === value ? "mt-1 block text-xs text-text-secondary" : "mt-1 block text-xs text-muted"}>{description}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal size={18} className="text-primary" />
          Bộ lọc thống kê
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label>
            <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Từ ngày</span>
            <Input type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} />
          </label>
          <label>
            <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Đến ngày</span>
            <Input type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} />
          </label>
          <label>
            <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Chu kỳ thời gian</span>
            <select className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]" value={filters.timeBucket} onChange={(event) => setFilters((current) => ({ ...current, timeBucket: event.target.value }))}>
              <option value="MONTH">Theo tháng</option>
              <option value="QUARTER">Theo quý</option>
              <option value="YEAR">Theo năm</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Nhóm theo</span>
            <Input placeholder="VD: courseType" value={filters.groupBy} onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value }))} />
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-border pt-4 text-sm text-foreground">
          <input
            checked={filters.includeInactiveUnits}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            onChange={(event) => setFilters((current) => ({ ...current, includeInactiveUnits: event.target.checked }))}
            type="checkbox"
          />
          <span>
            Bao gồm đơn vị ngưng hoạt động
            <span className="mt-0.5 block text-xs text-muted">
              Mặc định số liệu hiện tại (đơn vị, huynh trưởng) bỏ qua đơn vị bị khóa; số liệu lịch sử (đăng ký, chứng nhận, huynh trưởng mới theo thời gian) luôn tính đủ.
            </span>
          </span>
        </label>
      </Panel>

      <div>
        <h2 className="text-lg font-semibold leading-[26px]">{currentTab?.[1]}</h2>
        <p className="mt-1 text-sm text-muted">{currentTab?.[2]}</p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {toKpiList(query.data)
          .slice(0, 8)
          .map((metric, index) => (
            <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
          ))}
        {query.isLoading ? Array.from({ length: 4 }).map((_, index) => <div className="h-[132px] rounded-xl bg-white motion-safe:animate-pulse" key={index} />) : null}
      </section>

      {query.isLoading ? <ChartSkeleton /> : <ChartFrame description="Animation chạy khi chart vào viewport và tắt khi reduced motion." metricKeys={metricKeys} rows={rows} title="So sánh theo kỳ" type="bar" />}
    </div>
  );
}
