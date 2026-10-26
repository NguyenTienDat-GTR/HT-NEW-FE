"use client";

import { useMemo, useState } from "react";
import { AlertsPanel } from "@/modules/analytics/components/alerts-panel";
import { BarList, FunnelChart, type BarItem } from "@/modules/analytics/components/charts";
import { ColumnChart, DonutChart, Heatmap, PyramidChart, RadialGauge, type DonutSegment, type HeatRow } from "@/modules/analytics/components/charts-extra";
import { DataTable, RateCell, type Column } from "@/modules/analytics/components/data-table";
import { KpiCard } from "@/modules/analytics/components/kpi-card";
import { TrendChart } from "@/modules/analytics/components/lazy-charts";
import { EmptyState, SectionCard } from "@/modules/analytics/components/section-card";
import { AGE_RAMP, SERIES_COLOR, STATUS_COLOR } from "@/modules/analytics/colors";
import { fmtDecimal, fmtNumber, fmtPercent } from "@/modules/analytics/format";
import { funnelLabels, groupByOptions, keyLabel, kpiLabel, trendLabels } from "@/modules/analytics/labels";
import { formatPeriod } from "@/modules/analytics/period";
import type { DrillTarget } from "@/modules/analytics/queries";
import { breakdownsOf, metricNullable, metricNumber, toChartRows, type AnalyticsFilterState, type AnalyticsResponse, type Breakdown } from "@/modules/analytics/types";

export type TabProps = {
  data: AnalyticsResponse;
  filters: AnalyticsFilterState;
  busy: boolean;
  onDrill: (target: DrillTarget) => void;
};

function series(keys: string[]) {
  return keys.map((key) => ({ key, label: trendLabels[key] ?? key, color: SERIES_COLOR[key] ?? "var(--viz-1)" }));
}

function KpiGrid({ data, keys, busy }: { data: AnalyticsResponse; keys: string[]; busy: boolean }) {
  const items = keys.map((key) => data.kpis.find((kpi) => kpi.key === key)).filter((kpi): kpi is NonNullable<typeof kpi> => Boolean(kpi));
  return (
    <section aria-label="Chỉ số chính" className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      {items.map((kpi, index) => (
        <KpiCard busy={busy} color={SERIES_COLOR[kpi.key]} compare={Boolean(data.filters.compareFromDate)} index={index} key={kpi.key} kpi={kpi} />
      ))}
    </section>
  );
}

function toDonut(items: Breakdown[], metric = "count"): DonutSegment[] {
  return items.map((item) => ({ key: item.key, label: keyLabel(item.key, item.label), value: metricNumber(item, metric), color: STATUS_COLOR[item.key] ?? "var(--viz-neutral)" }));
}

/** Bản đồ nhiệt: cột là các kỳ của biểu đồ xu hướng, ô lấy từ khóa `p:<kỳ>` của BE. */
function toHeatRows(data: AnalyticsResponse): { columns: string[]; rows: HeatRow[] } {
  const columns = (data.trends ?? []).map((trend) => trend.period);
  const rows = breakdownsOf(data, "heat").map((item) => ({ key: item.key, label: item.label ?? item.key, cells: columns.map((column) => metricNumber(item, `p:${column}`)), total: metricNumber(item, "total") }));
  return { columns, rows };
}

function GaugeRow({ data, items }: { data: AnalyticsResponse; items: { key: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const kpi = data.kpis.find((entry) => entry.key === item.key);
        if (!kpi) return null;
        return <RadialGauge color={item.color} hint={kpi.denominator ? `${fmtNumber(kpi.numerator)} / ${fmtNumber(kpi.denominator)}` : undefined} key={item.key} label={kpiLabel(item.key)} value={kpi.value} />;
      })}
    </div>
  );
}

function HeatSection({ data, busy, title, description, onSelect, hue }: { data: AnalyticsResponse; busy: boolean; title: string; description: string; onSelect?: (row: HeatRow) => void; hue?: string }) {
  const { columns, rows } = toHeatRows(data);
  if (!rows.length) return null;
  return (
    <SectionCard busy={busy} description={description} title={title} tone="var(--viz-7)">
      <Heatmap ariaLabel={title} columnLabel={formatPeriod} columns={columns} hue={hue} onSelect={onSelect} rows={rows} />
    </SectionCard>
  );
}

const GROUP_METRIC_LABELS: Record<string, string> = {
  registrations: "Đăng ký",
  attended: "Tham dự",
  passed: "Đạt",
  total: "Tổng",
  approved: "Đã duyệt",
  pending: "Chờ duyệt",
  rejected: "Từ chối",
  count: "Số lượng",
  active: "Đang hoạt động",
  trained: "Đã qua huấn luyện",
};

/**
 * Phân tích theo nhóm do người dùng chọn ở bộ lọc: nằm ngay dưới các chỉ số chính để thấy ngay khi đổi nhóm,
 * có thể đổi chỉ số đang so sánh; bấm một nhóm để xem danh sách chi tiết.
 */
function GroupedSection({ data, busy, metrics, onSelect }: { data: AnalyticsResponse; busy: boolean; metrics: string[]; onSelect: (dimension: string, key: string, label: string) => void }) {
  const [metric, setMetric] = useState(metrics[0]);
  const groupBy = data.filters.groupBy;
  if (!groupBy) return null;
  const items = breakdownsOf(data, "grouped");
  const bars: BarItem[] = [...items]
    .sort((a, b) => metricNumber(b, metric) - metricNumber(a, metric))
    .map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, metric),
      display: fmtNumber(metricNumber(item, metric)),
      note: metrics
        .filter((key) => key !== metric)
        .map((key) => `${GROUP_METRIC_LABELS[key] ?? key} ${fmtNumber(metricNumber(item, key))}`)
        .join(" · "),
    }));
  return (
    <div id="grouped-section" style={{ scrollMarginTop: 88 }}>
      <SectionCard
        actions={
          <div aria-label="Chỉ số so sánh" className="inline-flex rounded-lg bg-surface-2 p-0.5" role="radiogroup">
            {metrics.map((key) => (
              <button
                aria-checked={metric === key}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${metric === key ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-foreground"}`}
                key={key}
                onClick={() => setMetric(key)}
                role="radio"
                type="button"
              >
                {GROUP_METRIC_LABELS[key] ?? key}
              </button>
            ))}
          </div>
        }
        busy={busy}
        description="Do bạn chọn ở bộ lọc “Phân tích theo nhóm”. Bấm một nhóm để xem danh sách chi tiết."
        title={`Phân tích theo ${groupTitle(groupBy).toLowerCase()}`}
        tone="var(--viz-2)"
      >
        {bars.length ? <BarList ariaLabel="Phân tích theo nhóm" items={bars} limit={15} onSelect={(bar) => onSelect(groupBy, bar.key, bar.label)} /> : <EmptyState hint="Không có dữ liệu để nhóm theo tiêu chí này trong bộ lọc hiện tại." title="Chưa có nhóm nào" />}
      </SectionCard>
    </div>
  );
}

function groupTitle(groupBy?: string | null) {
  return groupByOptions.find((option) => option.value === groupBy)?.label ?? "nhóm";
}

// ------------------------------------------------------------------ Khóa huấn luyện

export function CoursesTab({ data, filters, busy, onDrill }: TabProps) {
  const rows = useMemo(() => toChartRows(data.trends, data.previousTrends), [data.trends, data.previousTrends]);
  const courses = breakdownsOf(data, "course");
  const drill = (dimension: string, value: string, label: string): void => onDrill({ dataset: "participations", dimension, value, title: `Hồ sơ đăng ký · ${label}` });
  const unitType = breakdownsOf(data, "deanery").length ? "deanery" : "parish";
  const units = breakdownsOf(data, unitType);

  const asBars = (items: Breakdown[], dimension: string): BarItem[] =>
    items.map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, "registrations"),
      note: `Tham dự ${fmtNumber(metricNumber(item, "attended"))} · Đạt ${fmtNumber(metricNumber(item, "passed"))} (${fmtPercent(metricNullable(item, "passRate"))})`,
      display: fmtNumber(metricNumber(item, "registrations")),
    })).map((bar) => ({ ...bar, key: `${dimension}:${bar.key}` }));

  const select = (dimension: string) => (bar: BarItem) => drill(dimension, bar.key.slice(dimension.length + 1), bar.label);

  const columns: Column<Breakdown>[] = [
    { key: "name", label: "Khóa học", render: (row) => <span className="block max-w-[260px] truncate font-medium" title={row.label ?? row.key}>{row.label ?? row.key}</span>, sort: (row) => row.label ?? row.key },
    { key: "type", label: "Loại khóa", render: (row) => <span className="block max-w-[180px] truncate text-text-secondary">{String(row.metrics.courseTypeLabel ?? "—")}</span>, sort: (row) => String(row.metrics.courseTypeLabel ?? "") },
    { key: "start", label: "Bắt đầu", render: (row) => String(row.metrics.startDate ?? "").split("-").reverse().join("/"), sort: (row) => String(row.metrics.startDate ?? "") },
    { key: "state", label: "Trạng thái", render: (row) => keyLabel(String(row.metrics.organizingStatus ?? "")), sort: (row) => String(row.metrics.organizingStatus ?? "") },
    { key: "regs", label: "Đăng ký", align: "right", render: (row) => fmtNumber(metricNumber(row, "registrations")), sort: (row) => metricNumber(row, "registrations") },
    { key: "attended", label: "Tham dự", align: "right", render: (row) => fmtNumber(metricNumber(row, "attended")), sort: (row) => metricNumber(row, "attended") },
    { key: "passed", label: "Đạt", align: "right", render: (row) => fmtNumber(metricNumber(row, "passed")), sort: (row) => metricNumber(row, "passed") },
    { key: "rate", label: "Tỷ lệ đạt", align: "right", render: (row) => <RateCell color="var(--viz-3)" value={metricNullable(row, "passRate")} />, sort: (row) => metricNullable(row, "passRate") },
    { key: "score", label: "Điểm TB", align: "right", render: (row) => (metricNumber(row, "attended") ? fmtDecimal(metricNullable(row, "averageScore")) : "—"), sort: (row) => metricNullable(row, "averageScore") },
  ];

  return (
    <div className="space-y-6">
      <KpiGrid busy={busy} data={data} keys={["totalCourses", "registrations", "attendanceRate", "passRate", "cancellationRate", "rejectionRate", "certificateRate", "averageScore", "trainedLeaders"]} />
      <GroupedSection busy={busy} data={data} metrics={["registrations", "attended", "passed"]} onSelect={drill} />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <SectionCard busy={busy} className="xl:col-span-2" description="Theo ngày bắt đầu khóa. Đường nét đứt là kỳ liền trước cùng độ dài." title="Đăng ký, tham dự và đạt theo kỳ">
          <TrendChart ariaLabel="Xu hướng đăng ký, tham dự, đạt" rows={rows} series={series(["registrations", "attended", "passed"])} showPrevious={filters.compare} />
        </SectionCard>
        <SectionCard busy={busy} description="Mỗi bước là tập con của bước trước. Bấm để xem hồ sơ." title="Phễu huấn luyện">
          {data.funnel?.length ? <FunnelChart onSelect={(step) => drill("funnel", step.key, funnelLabels[step.key] ?? step.key)} steps={data.funnel} /> : <EmptyState />}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard busy={busy} description="Ba tỷ lệ chính của kỳ, tính trên cùng tập hồ sơ." title="Tỷ lệ chính" tone="var(--viz-3)">
          <GaugeRow data={data} items={[{ key: "attendanceRate", color: "var(--viz-2)" }, { key: "passRate", color: "var(--viz-3)" }, { key: "certificateRate", color: "var(--viz-4)" }]} />
        </SectionCard>
        <SectionCard busy={busy} delay={80} description="Hồ sơ theo trạng thái tham dự. Bấm để xem hồ sơ." title="Trạng thái hồ sơ" tone="var(--viz-2)">
          <DonutChart ariaLabel="Trạng thái hồ sơ" centerLabel="Hồ sơ" onSelect={(segment) => drill("participationStatus", segment.key, segment.label)} segments={toDonut(breakdownsOf(data, "participationStatus"))} size={132} />
        </SectionCard>
        <SectionCard busy={busy} className="lg:col-span-2 xl:col-span-1" delay={160} description="Số hồ sơ theo điểm tổng kết (thang 10)." title="Phân bố điểm" tone="var(--viz-5)">
          <ColumnChart ariaLabel="Phân bố điểm tổng kết" color="var(--viz-5)" items={breakdownsOf(data, "scoreBucket").map((item) => ({ key: item.key, label: item.key === "10" ? "10" : `${item.key}`, value: metricNumber(item, "count") }))} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
        <SectionCard busy={busy} defer description="Lượt đăng ký theo loại khóa. Bấm để xem hồ sơ." title="Theo loại khóa">
          <BarList ariaLabel="Đăng ký theo loại khóa" items={asBars(breakdownsOf(data, "courseType"), "courseType")} onSelect={select("courseType")} />
        </SectionCard>
        {units.length ? (
          <SectionCard busy={busy} defer description="Đơn vị có nhiều lượt đăng ký nhất." title={unitType === "deanery" ? "Theo giáo hạt" : "Theo giáo xứ"}>
            <BarList ariaLabel="Đăng ký theo đơn vị" items={asBars(units, unitType)} onSelect={select(unitType)} />
          </SectionCard>
        ) : (
          <SectionCard busy={busy} defer description="Lượt đăng ký theo cấp bậc hiện tại của huynh trưởng." title="Theo cấp bậc">
            <BarList ariaLabel="Đăng ký theo cấp bậc" items={asBars(breakdownsOf(data, "leaderLevel"), "leaderLevel")} onSelect={select("leaderLevel")} />
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
        {units.length ? (
          <SectionCard busy={busy} defer description="Lượt đăng ký theo cấp bậc hiện tại của huynh trưởng." title="Theo cấp bậc">
            <BarList ariaLabel="Đăng ký theo cấp bậc" items={asBars(breakdownsOf(data, "leaderLevel"), "leaderLevel")} onSelect={select("leaderLevel")} />
          </SectionCard>
        ) : null}
        <SectionCard busy={busy} className={units.length ? undefined : "lg:col-span-2"} defer description="Giới tính được ghi nhận trong hồ sơ huynh trưởng." title="Theo giới tính">
          <DonutChart ariaLabel="Cơ cấu đăng ký theo giới tính" centerLabel="Đăng ký" onSelect={(segment) => drill("gender", segment.key, segment.label)} segments={toDonut(breakdownsOf(data, "gender"), "registrations")} size={132} />
        </SectionCard>
      </div>


      <HeatSection busy={busy} data={data} description="Số đăng ký theo đơn vị (hoặc cấp bậc) và kỳ; ô đậm là nhiều. Bấm tên để xem hồ sơ." onSelect={(row) => drill(data.scope === "diocese" ? "deanery" : data.scope === "deanery" ? "parish" : "leaderLevel", row.key, row.label)} title="Mức độ đăng ký theo đơn vị và kỳ" />

      <SectionCard busy={busy} defer description="Bấm một dòng để xem hồ sơ của khóa. Sắp xếp theo cột." title="Chi tiết từng khóa" tone="var(--viz-1)">
        <DataTable ariaLabel="Chi tiết từng khóa" columns={columns} initialSort={{ key: "start", direction: "desc" }} onRowClick={(row) => drill("course", row.key, row.label ?? row.key)} rowKey={(row) => row.key} rows={courses} />
      </SectionCard>

      {data.alerts?.length ? (
        <SectionCard busy={busy} defer description="Tính trên các khóa trong kỳ; ngưỡng và mẫu tối thiểu được cố định để tránh báo động từ mẫu nhỏ." title="Điểm cần chú ý">
          <AlertsPanel alerts={data.alerts} />
        </SectionCard>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------- Chứng nhận

export function CertificatesTab({ data, filters, busy, onDrill }: TabProps) {
  const rows = useMemo(() => toChartRows(data.trends, data.previousTrends), [data.trends, data.previousTrends]);
  const statuses = breakdownsOf(data, "approvalStatus");
  const drill = (dimension: string, value: string, label: string): void => onDrill({ dataset: "certificates", dimension, value, title: `Chứng nhận · ${label}` });
  const unitType = breakdownsOf(data, "deanery").length ? "deanery" : "parish";

  const asBars = (items: Breakdown[], dimension: string): BarItem[] =>
    items.map((item) => ({
      key: `${dimension}:${item.key}`,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, "total"),
      display: fmtNumber(metricNumber(item, "total")),
      note: `Đã duyệt ${fmtNumber(metricNumber(item, "approved"))} · Chờ ${fmtNumber(metricNumber(item, "pending"))} · Từ chối ${fmtNumber(metricNumber(item, "rejected"))}`,
    }));
  const select = (dimension: string) => (bar: BarItem) => drill(dimension, bar.key.slice(dimension.length + 1), bar.label);
  const kpi = (key: string) => data.kpis.find((item) => item.key === key);
  const revoked = kpi("revoked");

  return (
    <div className="space-y-6">
      <KpiGrid busy={busy} data={data} keys={["totalCertificates", "approvalRate", "conversionRate", "medianApprovalHours", "pending", "rejected", "revoked", "exceptionRate"]} />
      <GroupedSection busy={busy} data={data} metrics={["total", "approved", "pending", "rejected"]} onSelect={drill} />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <SectionCard busy={busy} className="xl:col-span-2" description="Theo ngày cấp, hoặc ngày tạo khi chưa cấp để hồ sơ chờ duyệt không bị bỏ sót." title="Chứng nhận theo trạng thái và kỳ">
          <TrendChart ariaLabel="Chứng nhận theo trạng thái" rows={rows} series={series(["approved", "pending", "rejected", "revoked"])} variant="stackedBar" />
        </SectionCard>
        <SectionCard busy={busy} description="Cơ cấu trạng thái trong kỳ. Bấm để xem chứng nhận." title="Trạng thái duyệt">
          {statuses.length ? (
            <>
              <DonutChart ariaLabel="Cơ cấu trạng thái chứng nhận" centerLabel="Chứng nhận" onSelect={(segment) => drill("approvalStatus", segment.key, segment.label)} segments={toDonut(statuses)} size={132} />
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[13px]">
                <div>
                  <dt className="text-muted">Hệ thống gợi ý</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{fmtPercent(kpi("systemSuggestedRate")?.value)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Giờ duyệt trung bình</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{fmtDecimal(kpi("averageApprovalHours")?.value)} giờ</dd>
                </div>
                {revoked ? (
                  <div>
                    <dt className="text-muted">Đã thu hồi</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{fmtNumber(revoked.value)}</dd>
                  </div>
                ) : null}
              </dl>
            </>
          ) : (
            <EmptyState />
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
        <SectionCard busy={busy} defer description="Hồ sơ đạt đã được cấp chứng nhận trong cùng tập hồ sơ." title="Chuyển đổi từ kết quả đạt">
          {data.funnel?.length ? <FunnelChart labels={funnelLabels} steps={data.funnel} /> : <EmptyState />}
        </SectionCard>
        <SectionCard busy={busy} defer description="Chứng nhận đã duyệt chia theo thời gian từ lúc tạo đến lúc duyệt." title="Tốc độ duyệt" tone="var(--viz-2)">
          <ColumnChart ariaLabel="Phân bố thời gian duyệt" color="var(--viz-2)" items={breakdownsOf(data, "approvalTime").map((item) => ({ key: item.key, label: keyLabel(item.key), value: metricNumber(item, "count"), color: STATUS_COLOR[item.key] }))} />
        </SectionCard>
        <SectionCard busy={busy} defer description="Chứng nhận theo khóa học, nhiều nhất trước." title="Theo khóa học">
          <BarList ariaLabel="Chứng nhận theo khóa" items={asBars(breakdownsOf(data, "course"), "course")} onSelect={select("course")} />
        </SectionCard>
        <SectionCard busy={busy} defer title="Theo loại khóa">
          <BarList ariaLabel="Chứng nhận theo loại khóa" items={asBars(breakdownsOf(data, "courseType"), "courseType")} onSelect={select("courseType")} />
        </SectionCard>
        {breakdownsOf(data, unitType).length ? (
          <SectionCard busy={busy} defer title={unitType === "deanery" ? "Theo giáo hạt" : "Theo giáo xứ"}>
            <BarList ariaLabel="Chứng nhận theo đơn vị" items={asBars(breakdownsOf(data, unitType), unitType)} onSelect={select(unitType)} />
          </SectionCard>
        ) : null}
      </div>

      <HeatSection busy={busy} data={data} description="Số chứng nhận theo đơn vị (hoặc cấp bậc) và kỳ." hue="var(--viz-3)" title="Chứng nhận theo đơn vị và kỳ" />


      {data.alerts?.length ? (
        <SectionCard busy={busy} defer title="Điểm cần chú ý" tone="var(--viz-4)">
          <AlertsPanel alerts={data.alerts} />
        </SectionCard>
      ) : null}
      <span className="sr-only">{filters.timeBucket}</span>
    </div>
  );
}

// ---------------------------------------------------------------------- Huynh trưởng

export function LeadersTab({ data, filters, busy, onDrill }: TabProps) {
  const rows = useMemo(() => toChartRows(data.trends, data.previousTrends), [data.trends, data.previousTrends]);
  const drill = (dimension: string, value: string, label: string): void => onDrill({ dataset: "leaders", dimension, value, title: `Huynh trưởng · ${label}` });
  const asBars = (items: Breakdown[], dimension: string, ramp = false): BarItem[] =>
    items.map((item, index) => ({
      key: `${dimension}:${item.key}`,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, "count"),
      display: `${fmtNumber(metricNumber(item, "count"))} · ${fmtPercent(metricNullable(item, "share"))}`,
      note: `Hoạt động ${fmtNumber(metricNumber(item, "active"))} · Đã qua huấn luyện ${fmtNumber(metricNumber(item, "trained"))}`,
      color: ramp ? AGE_RAMP[index] : undefined,
    }));
  const select = (dimension: string) => (bar: BarItem) => drill(dimension, bar.key.slice(dimension.length + 1), bar.label);
  const unitType = breakdownsOf(data, "deanery").length ? "deanery" : "parish";
  const units = breakdownsOf(data, unitType);

  return (
    <div className="space-y-6">
      <KpiGrid busy={busy} data={data} keys={["totalLeaders", "activeRate", "trainedRate", "newLeaders", "promotions", "femaleRate", "averageAge", "youthRate"]} />
      <GroupedSection busy={busy} data={data} metrics={["count", "active", "trained"]} onSelect={drill} />

      <SectionCard busy={busy} description="Hồ sơ mới theo ngày tạo hồ sơ trong hệ thống; thăng cấp lấy từ lịch sử cấp bậc (không tính lượt đã hoàn tác)." title="Hồ sơ mới và thăng cấp theo kỳ">
        <TrendChart ariaLabel="Hồ sơ mới và thăng cấp" rows={rows} series={series(["newLeaders", "promotions"])} showPrevious={filters.compare} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <SectionCard busy={busy} description="Số hồ sơ cộng dồn theo kỳ; chưa trừ huynh trưởng đã nghỉ vì hệ thống không lưu lịch sử trạng thái." title="Quy mô hồ sơ tích lũy" tone="var(--viz-7)" className="xl:col-span-2">
          <TrendChart ariaLabel="Hồ sơ tích lũy" height={240} rows={rows} series={series(["cumulative"])} variant="area" />
        </SectionCard>
        <SectionCard busy={busy} delay={80} description="Cấp bậc đạt được trong kỳ." title="Thăng cấp theo cấp bậc" tone="var(--viz-4)">
          {breakdownsOf(data, "promotionLevel").length ? <BarList ariaLabel="Thăng cấp theo cấp bậc" items={breakdownsOf(data, "promotionLevel").map((item) => ({ key: item.key, label: keyLabel(item.key, item.label), value: metricNumber(item, "count") }))} /> : <EmptyState hint="Không có lượt thăng cấp trong kỳ." title="Chưa có thăng cấp" />}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
        <SectionCard busy={busy} description="Cơ cấu hiện tại. Bấm để xem danh sách." title="Giới tính" tone="var(--viz-5)">
          <DonutChart ariaLabel="Cơ cấu giới tính" centerLabel="Huynh trưởng" onSelect={(segment) => drill("gender", segment.key, segment.label)} segments={toDonut(breakdownsOf(data, "gender"))} />
        </SectionCard>
        <SectionCard busy={busy} delay={80} title="Trạng thái hoạt động" tone="var(--viz-3)">
          <DonutChart ariaLabel="Cơ cấu trạng thái" centerLabel="Huynh trưởng" onSelect={(segment) => drill("status", segment.key, segment.label)} segments={toDonut(breakdownsOf(data, "status"))} />
        </SectionCard>
        <SectionCard busy={busy} className="lg:col-span-2" description="Tháp dân số: nam bên trái, nữ bên phải, cùng một thang. Bấm một cột để xem danh sách nhóm tuổi." title="Nhóm tuổi theo giới tính" tone="var(--viz-1)">
          <PyramidChart
            ariaLabel="Tháp dân số theo nhóm tuổi"
            leftLabel="Nam"
            onSelect={(row) => drill("ageGroup", row.key, row.label)}
            rightLabel="Nữ"
            rows={breakdownsOf(data, "agePyramid").map((item) => ({ key: item.key, label: keyLabel(item.key), left: metricNumber(item, "male"), right: metricNumber(item, "female") }))}
          />
        </SectionCard>
        <SectionCard busy={busy} defer title="Cấp bậc">
          <BarList ariaLabel="Phân bố cấp bậc" items={asBars(breakdownsOf(data, "leaderLevel"), "leaderLevel")} onSelect={select("leaderLevel")} />
        </SectionCard>
        {units.length ? (
          <SectionCard busy={busy} defer title={unitType === "deanery" ? "Theo giáo hạt" : "Theo giáo xứ"}>
            <BarList ariaLabel="Huynh trưởng theo đơn vị" items={asBars(units, unitType)} onSelect={select(unitType)} />
          </SectionCard>
        ) : null}
      </div>


      {data.alerts?.length ? (
        <SectionCard busy={busy} defer title="Điểm cần chú ý">
          <AlertsPanel alerts={data.alerts} />
        </SectionCard>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------------- Tổ chức

export function OrganizationTab({ data, filters, busy, onDrill }: TabProps) {
  const rows = useMemo(() => toChartRows(data.trends, data.previousTrends), [data.trends, data.previousTrends]);
  const unitRows = breakdownsOf(data, "unit");
  const isDiocese = data.scope === "diocese";
  const drill = (dimension: string, value: string, label: string): void => onDrill({ dataset: "leaders", dimension, value, title: `Huynh trưởng · ${label}` });
  const levelBars: BarItem[] = breakdownsOf(data, "leaderLevel").map((item) => ({
    key: item.key,
    label: keyLabel(item.key, item.label),
    value: metricNumber(item, "count"),
    display: `${fmtNumber(metricNumber(item, "count"))} · ${fmtPercent(metricNullable(item, "share"))}`,
  }));
  const unitBars: BarItem[] = [...unitRows]
    .sort((a, b) => metricNumber(b, "leaders") - metricNumber(a, "leaders"))
    .map((item) => ({ key: item.key, label: item.label ?? item.key, value: metricNumber(item, "leaders"), display: fmtNumber(metricNumber(item, "leaders")), note: `Hoạt động ${fmtNumber(metricNumber(item, "activeLeaders"))} · Đã qua huấn luyện ${fmtNumber(metricNumber(item, "trainedLeaders"))}` }));

  const columns: Column<Breakdown>[] = [
    {
      key: "unit",
      label: isDiocese ? "Giáo hạt" : "Giáo xứ",
      render: (row) => (
        <span className="inline-flex items-center gap-2 font-medium">
          {row.label}
          {row.metrics.operational === false ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">Ngưng</span> : null}
        </span>
      ),
      sort: (row) => row.label ?? row.key,
    },
    ...(isDiocese ? [{ key: "parishes", label: "Giáo xứ", align: "right" as const, render: (row: Breakdown) => fmtNumber(metricNumber(row, "parishes")), sort: (row: Breakdown) => metricNumber(row, "parishes") }] : []),
    { key: "leaders", label: "Huynh trưởng", align: "right", render: (row) => fmtNumber(metricNumber(row, "leaders")), sort: (row) => metricNumber(row, "leaders") },
    { key: "active", label: "Hoạt động", align: "right", render: (row) => fmtNumber(metricNumber(row, "activeLeaders")), sort: (row) => metricNumber(row, "activeLeaders") },
    { key: "trained", label: "Đã qua huấn luyện", align: "right", render: (row) => fmtNumber(metricNumber(row, "trainedLeaders")), sort: (row) => metricNumber(row, "trainedLeaders") },
    { key: "regs", label: "Đăng ký (kỳ)", align: "right", render: (row) => fmtNumber(metricNumber(row, "registrations")), sort: (row) => metricNumber(row, "registrations") },
    { key: "rate", label: "Tỷ lệ đạt (kỳ)", align: "right", render: (row) => <RateCell color="var(--viz-3)" value={metricNullable(row, "passRate")} />, sort: (row) => metricNullable(row, "passRate") },
  ];

  return (
    <div className="space-y-6">
      <KpiGrid busy={busy} data={data} keys={["totalDeaneries", "totalParishes", "parishesWithoutLeaders", "leadersPerParish", "totalLeaders", "activeRate", "trainedRate", "newLeaders"]} />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <SectionCard busy={busy} className="xl:col-span-2" description="Hồ sơ huynh trưởng mới và thăng cấp theo kỳ." title="Phát triển nhân sự theo kỳ">
          <TrendChart ariaLabel="Phát triển nhân sự" rows={rows} series={series(["newLeaders", "promotions"])} showPrevious={filters.compare} />
        </SectionCard>
        <SectionCard busy={busy} delay={80} description="Cơ cấu cấp bậc hiện tại. Bấm để xem danh sách." title="Cấp bậc" tone="var(--viz-7)">
          <DonutChart ariaLabel="Cấp bậc" centerLabel="Huynh trưởng" onSelect={(segment) => drill("leaderLevel", segment.key, segment.label)} segments={levelBars.map((bar, index) => ({ key: bar.key, label: bar.label, value: bar.value, color: `var(--viz-${(index % 8) + 1})` }))} size={132} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <SectionCard busy={busy} description="Hoạt động và đã qua huấn luyện trên tổng huynh trưởng." title="Tỉ lệ hoạt động và huấn luyện" tone="var(--viz-3)">
          <GaugeRow data={data} items={[{ key: "activeRate", color: "var(--viz-3)" }, { key: "trainedRate", color: "var(--viz-7)" }]} />
        </SectionCard>
        <SectionCard busy={busy} className="xl:col-span-2" delay={80} description="Tháp dân số: nam bên trái, nữ bên phải, cùng một thang. Bấm một cột để xem danh sách nhóm tuổi." title="Nhóm tuổi theo giới tính" tone="var(--viz-1)">
          <PyramidChart
            ariaLabel="Tháp dân số theo nhóm tuổi"
            leftLabel="Nam"
            onSelect={(row) => drill("ageGroup", row.key, row.label)}
            rightLabel="Nữ"
            rows={breakdownsOf(data, "agePyramid").map((item) => ({ key: item.key, label: keyLabel(item.key), left: metricNumber(item, "male"), right: metricNumber(item, "female") }))}
          />
        </SectionCard>
      </div>

      {unitRows.length ? (
        <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
          <SectionCard busy={busy} defer description="Số huynh trưởng mỗi đơn vị." title={isDiocese ? "Huynh trưởng theo giáo hạt" : "Huynh trưởng theo giáo xứ"}>
            <BarList ariaLabel="Huynh trưởng theo đơn vị" items={unitBars} onSelect={(bar) => drill(isDiocese ? "deanery" : "parish", bar.key, bar.label)} />
          </SectionCard>
          <SectionCard busy={busy} className="xl:col-span-2" defer description="Bấm một dòng để xem huynh trưởng của đơn vị." title={isDiocese ? "Bảng giáo hạt" : "Bảng giáo xứ"}>
            <DataTable ariaLabel="Bảng đơn vị" columns={columns} initialSort={{ key: "leaders", direction: "desc" }} onRowClick={(row) => drill(isDiocese ? "deanery" : "parish", row.key, row.label ?? row.key)} rowKey={(row) => row.key} rows={unitRows} />
          </SectionCard>
        </div>
      ) : null}

      {data.alerts?.length ? (
        <SectionCard busy={busy} defer title="Điểm cần chú ý">
          <AlertsPanel alerts={data.alerts} />
        </SectionCard>
      ) : null}
    </div>
  );
}
