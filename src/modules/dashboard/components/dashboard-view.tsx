"use client";

import { Bell } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AlertsPanel } from "@/modules/analytics/components/alerts-panel";
import { BarList, FunnelChart, type BarItem } from "@/modules/analytics/components/charts";
import { DonutChart } from "@/modules/analytics/components/charts-extra";
import { STATUS_COLOR } from "@/modules/analytics/colors";
import { FilterBar } from "@/modules/analytics/components/filter-bar";
import { KpiCard } from "@/modules/analytics/components/kpi-card";
import { TrendChart } from "@/modules/analytics/components/lazy-charts";
import { PageHeader } from "@/modules/analytics/components/page-header";
import { RecordsDrawer } from "@/modules/analytics/components/records-drawer";
import { ChartSkeletonCard, EmptyState, ErrorState, KpiSkeletons, SectionCard, SkeletonBlock } from "@/modules/analytics/components/section-card";
import { OpenCourses } from "@/modules/analytics/components/open-courses";
import { WorkQueue } from "@/modules/analytics/components/work-queue";
import { SERIES_COLOR } from "@/modules/analytics/colors";
import { fmtNumber, fmtPercent } from "@/modules/analytics/format";
import { funnelLabels, keyLabel, trendLabels } from "@/modules/analytics/labels";
import { useAnalytics, useFilterOptions, useOpenCourses, useScopes, useWorkQueue, type DrillTarget } from "@/modules/analytics/queries";
import { breakdownsOf, defaultFilters, metricNullable, metricNumber, toChartRows, type AnalyticsFilterState, type Breakdown } from "@/modules/analytics/types";
import { dashboardQueries } from "@/modules/dashboard/queries";

type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
};

const SCOPE_LABEL: Record<string, string> = { all: "Toàn hệ thống", diocese: "Giáo phận", deanery: "Giáo hạt", parish: "Giáo xứ" };
const VISIBLE = { course: true, leader: false, unit: true, groupBy: false, inactive: false } as const;
// Giáo xứ không tổ chức khóa và chỉ có một đơn vị: không có bộ lọc khóa hay đơn vị.
const PARISH_VISIBLE = { course: false, leader: false, unit: false, groupBy: false, inactive: false } as const;
const HERO_KPIS = ["activeLeaders", "newLeaders", "registrations", "passRate", "approvedCertificates", "pendingApproval"];

export function DashboardView() {
  // Không nhớ bộ lọc qua phiên: trang này được dựng sẵn ở server với bộ lọc mặc định, lưu trạng thái sẽ làm HTML lệch so với client.
  const [filters, setFilters] = useState<AnalyticsFilterState>(defaultFilters);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const overview = useAnalytics("overview", filters);
  const data = overview.data;
  const systemWide = data?.scope === "all";
  const isParish = data?.scope === "parish";
  const scopes = useScopes();
  const options = useFilterOptions(filters.scope || data?.scope || "", Boolean(data) && !systemWide);
  const workQueue = useWorkQueue(filters.scope, Boolean(data) && !systemWide && !isParish);
  const openCourses = useOpenCourses(filters.scope, isParish);
  const notifications = useQuery({ queryKey: dashboardQueries.notifications.key, queryFn: () => apiFetch<PageResponse<NotificationItem>>(dashboardQueries.notifications.path) });

  const rows = useMemo(() => toChartRows(data?.trends, data?.previousTrends), [data?.trends, data?.previousTrends]);
  const busy = overview.isFetching;
  const drillTo = (dimension: string, value: string, label: string) => setDrill({ dataset: "participations", dimension, value, title: `Hồ sơ đăng ký · ${label}` });

  const bars = (items: Breakdown[], dimension: string): BarItem[] =>
    items.map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, "registrations"),
      display: fmtNumber(metricNumber(item, "registrations")),
      note: `Đạt ${fmtNumber(metricNumber(item, "passed"))} · Tỷ lệ đạt ${fmtPercent(metricNullable(item, dimension === "course" ? "passRate" : "passRate"))}`,
    }));
  const unitItems = breakdownsOf(data, "unit");

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={data ? `Phạm vi: ${SCOPE_LABEL[data.scope] ?? data.scope}. ${isParish ? "Nhân sự, chứng nhận và các khóa đang mở đăng ký của giáo xứ." : "Số liệu tổng hợp, việc cần xử lý và điểm cần chú ý trong một màn hình."}` : "Theo dõi hệ thống, việc cần xử lý và điểm cần chú ý."}
        title="Tổng quan"
      />

      {systemWide ? null : (
        <FilterBar appliedRange={data?.filters} busy={busy} filters={filters} onChange={setFilters} options={options.data} scope={data?.scope} scopes={scopes.data} visible={isParish ? PARISH_VISIBLE : VISIBLE} />
      )}

      {overview.isError && !data ? (
        <ErrorState onRetry={() => overview.refetch()} />
      ) : !data ? (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">
            <KpiSkeletons count={6} />
          </section>
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
            <ChartSkeletonCard className="xl:col-span-2" />
            <ChartSkeletonCard />
          </div>
        </>
      ) : (
        <>
          <section aria-label="Chỉ số chính" className={cn("grid grid-cols-2 gap-2.5 sm:gap-4", systemWide ? "xl:grid-cols-4" : "md:grid-cols-3 xl:grid-cols-6")}>
            {(systemWide || isParish ? data.kpis : HERO_KPIS.map((key) => data.kpis.find((kpi) => kpi.key === key)).filter((kpi): kpi is NonNullable<typeof kpi> => Boolean(kpi))).map((kpi, index) => (
              <KpiCard busy={busy} color={SERIES_COLOR[kpi.key]} compare={Boolean(data.filters.compareFromDate)} index={index} key={kpi.key} kpi={kpi} />
            ))}
          </section>

          {systemWide ? (
            <Panel className="p-5 text-sm text-text-secondary">Tài khoản quản trị hệ thống chỉ xem số liệu tổng số. Phân tích chi tiết nằm ở các tài khoản theo giáo phận, giáo hạt hoặc giáo xứ.</Panel>
          ) : isParish ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
                <SectionCard className="xl:col-span-2" description="Khóa của giáo hạt và giáo phận đang nhận đăng ký. Bấm vào khóa để sang khóa đó và đăng ký tham dự." title="Khóa huấn luyện đang mở đăng ký" tone="var(--viz-3)">
                  <OpenCourses courses={openCourses.data} loading={openCourses.isLoading} />
                </SectionCard>
                <SectionCard delay={80} description="Tự động phát hiện từ dữ liệu của giáo xứ." title="Điểm cần chú ý" tone="var(--viz-4)">
                  <AlertsPanel alerts={data.alerts ?? []} />
                </SectionCard>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
                <SectionCard busy={busy} className="xl:col-span-2" description="Hồ sơ huynh trưởng mới và thăng cấp của giáo xứ. Đường nét đứt là kỳ liền trước." title="Nhân sự theo kỳ" tone="var(--viz-1)">
                  <TrendChart ariaLabel="Hồ sơ mới và thăng cấp" rows={rows} series={["newLeaders", "promotions"].map((key) => ({ key, label: trendLabels[key], color: SERIES_COLOR[key] }))} showPrevious={filters.compare} />
                </SectionCard>
                <SectionCard busy={busy} delay={80} description="Cơ cấu giới tính hiện tại." title="Giới tính" tone="var(--viz-5)">
                  <DonutChart
                    ariaLabel="Cơ cấu giới tính"
                    centerLabel="Huynh trưởng"
                    onSelect={(segment) => setDrill({ dataset: "leaders", dimension: "gender", value: segment.key, title: `Huynh trưởng · ${segment.label}` })}
                    segments={breakdownsOf(data, "gender").map((item) => ({ key: item.key, label: keyLabel(item.key, item.label), value: metricNumber(item, "count"), color: STATUS_COLOR[item.key] ?? "var(--viz-neutral)" }))}
                    size={132}
                  />
                </SectionCard>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
                <SectionCard busy={busy} description="Cấp bậc hiện tại của huynh trưởng." title="Cấp bậc" tone="var(--viz-7)">
                  <BarList
                    ariaLabel="Cấp bậc"
                    items={breakdownsOf(data, "leaderLevel").map((item) => ({ key: item.key, label: keyLabel(item.key, item.label), value: metricNumber(item, "count"), display: fmtNumber(metricNumber(item, "count")) }))}
                    onSelect={(bar) => setDrill({ dataset: "leaders", dimension: "leaderLevel", value: bar.key, title: `Huynh trưởng · ${bar.label}` })}
                  />
                </SectionCard>
                <SectionCard actions={<Link className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover" href="/notifications">Xem tất cả</Link>} description="Các sự kiện quy trình gần đây." title="Thông báo mới">
                  <ul className="space-y-1">
                    {(notifications.data?.content ?? []).map((item) => (
                      <li className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-1" key={item.id}>
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", item.readAt ? "bg-surface-2 text-muted" : "bg-primary-soft text-primary")}>
                          <Bell className="h-4 w-4" weight="bold" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
                        <span className={cn("shrink-0 text-xs", item.readAt ? "text-muted" : "font-semibold text-primary")}>{item.readAt ? "Đã đọc" : "Mới"}</span>
                      </li>
                    ))}
                    {!notifications.isLoading && !notifications.data?.content.length ? <li className="rounded-lg bg-surface-1 p-3 text-sm text-muted">Chưa có thông báo mới.</li> : null}
                  </ul>
                </SectionCard>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
                <SectionCard className="xl:col-span-2" description="Những việc đang chờ bạn. Bấm để mở đúng màn hình xử lý." title="Việc cần xử lý">
                  {workQueue.data ? <WorkQueue items={workQueue.data} /> : <SkeletonBlock className="h-[132px] w-full" />}
                </SectionCard>
                <SectionCard description="Tự động phát hiện từ dữ liệu hiện tại, từ nghiêm trọng tới thông tin." title="Điểm cần chú ý">
                  <AlertsPanel alerts={data.alerts ?? []} />
                </SectionCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
                <SectionCard busy={busy} className="xl:col-span-2" description="Theo ngày bắt đầu khóa. Đường nét đứt là kỳ liền trước cùng độ dài." title="Hoạt động huấn luyện theo kỳ">
                  <TrendChart ariaLabel="Xu hướng đăng ký, tham dự, đạt" rows={rows} series={["registrations", "attended", "passed"].map((key) => ({ key, label: trendLabels[key], color: SERIES_COLOR[key] }))} showPrevious={filters.compare} />
                </SectionCard>
                <SectionCard busy={busy} description="Hồ sơ đi qua từng bước. Bấm để xem danh sách." title="Phễu huấn luyện">
                  {data.funnel?.length ? <FunnelChart labels={funnelLabels} onSelect={(step) => drillTo("funnel", step.key, funnelLabels[step.key] ?? step.key)} steps={data.funnel} /> : <EmptyState />}
                </SectionCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                <SectionCard busy={busy} defer description="Khóa có nhiều lượt đăng ký nhất trong kỳ." title="Khóa nổi bật">
                  <BarList ariaLabel="Khóa có nhiều đăng ký" items={bars(breakdownsOf(data, "course"), "course")} limit={5} onSelect={(bar) => drillTo("course", bar.key, bar.label)} />
                </SectionCard>
                {unitItems.length ? (
                  <SectionCard busy={busy} defer description="Đơn vị có nhiều lượt đăng ký nhất trong kỳ." title={data.scope === "diocese" ? "Giáo hạt tham gia nhiều" : "Giáo xứ tham gia nhiều"}>
                    <BarList ariaLabel="Đăng ký theo đơn vị" items={bars(unitItems, data.scope === "diocese" ? "deanery" : "parish")} limit={5} onSelect={(bar) => drillTo(data.scope === "diocese" ? "deanery" : "parish", bar.key, bar.label)} />
                  </SectionCard>
                ) : (
                  <SectionCard busy={busy} defer description="Lượt đăng ký theo loại khóa." title="Theo loại khóa">
                    <DonutChart
                      ariaLabel="Đăng ký theo loại khóa"
                      centerLabel="Đăng ký"
                      onSelect={(segment) => drillTo("courseType", segment.key, segment.label)}
                      segments={breakdownsOf(data, "courseType").map((item, index) => ({ key: item.key, label: keyLabel(item.key, item.label), value: metricNumber(item, "registrations"), color: `var(--viz-${(index % 6) + 1})` }))}
                      size={132}
                    />
                  </SectionCard>
                )}
                <SectionCard
                  actions={
                    <Link className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover" href="/notifications">
                      Xem tất cả
                    </Link>
                  }
                  className="lg:col-span-2 2xl:col-span-1"
                  defer
                  description="Các sự kiện quy trình gần đây."
                  title="Thông báo mới"
                >
                  <ul className="space-y-1">
                    {(notifications.data?.content ?? []).map((item, index) => (
                      <li className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-1" key={item.id}>
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", item.readAt ? "bg-surface-2 text-muted" : index % 2 === 0 ? "bg-[#fdecec] text-[var(--viz-critical)]" : "bg-primary-soft text-primary")}>
                          <Bell className="h-4 w-4" weight="bold" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
                        <span className={cn("shrink-0 text-xs", item.readAt ? "text-muted" : "font-semibold text-primary")}>{item.readAt ? "Đã đọc" : "Mới"}</span>
                      </li>
                    ))}
                    {!notifications.isLoading && !notifications.data?.content.length ? <li className="rounded-lg bg-surface-1 p-3 text-sm text-muted">Chưa có thông báo mới.</li> : null}
                  </ul>
                </SectionCard>
              </div>
            </>
          )}
        </>
      )}

      <RecordsDrawer filters={filters} onClose={() => setDrill(null)} target={drill} />
    </div>
  );
}
