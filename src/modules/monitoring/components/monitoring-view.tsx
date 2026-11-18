"use client";

import { ArrowsClockwise, CaretDown, CaretUp, CheckCircle, Info, Minus, Warning, WarningOctagon, type Icon } from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { cn, viNumber } from "@/lib/utils";
import { DataTable, type Column } from "@/modules/analytics/components/data-table";
import { TrendChart } from "@/modules/analytics/components/lazy-charts";
import { PageHeader } from "@/modules/analytics/components/page-header";
import { ChartSkeletonCard, ErrorState, KpiSkeletons, SectionCard } from "@/modules/analytics/components/section-card";
import { compareWithPrevious, formatDuration, formatMonitoringTime, MONITORING_RANGES, timelineRows, type MonitoringChange } from "@/modules/monitoring/format";
import type { MonitoringAccountActivity, MonitoringAlert, MonitoringAlertSeverity, MonitoringEndpointActivity, MonitoringIpActivity, MonitoringOverview } from "@/modules/monitoring/types";

const REFRESH_MS = 60_000;

const SEVERITY: Record<MonitoringAlertSeverity, { label: string; icon: Icon; className: string; iconClassName: string }> = {
  CRITICAL: { label: "Nghiêm trọng", icon: WarningOctagon, className: "border-danger/30 bg-[#fef2f2]", iconClassName: "text-danger" },
  WARNING: { label: "Cần chú ý", icon: Warning, className: "border-[#f5d48a] bg-[#fffbeb]", iconClassName: "text-[#b45309]" },
  INFO: { label: "Thông tin", icon: Info, className: "border-border bg-surface-1", iconClassName: "text-primary" },
};

function AlertList({ alerts }: { alerts: MonitoringAlert[] }) {
  if (!alerts.length) {
    return (
      <Panel className="flex items-center gap-3 p-4">
        <CheckCircle className="h-5 w-5 shrink-0 text-[#15803d]" weight="fill" />
        <p className="text-sm font-medium text-foreground">Chưa phát hiện bất thường trong 60 phút qua.</p>
      </Panel>
    );
  }
  return (
    <ul aria-label="Cảnh báo bất thường" className="grid gap-2">
      {alerts.map((alert) => {
        const severity = SEVERITY[alert.severity];
        const AlertIcon = severity.icon;
        return (
          <li className={cn("flex items-start gap-3 rounded-xl border p-4", severity.className)} key={`${alert.code}-${alert.title}`}>
            <AlertIcon className={cn("mt-0.5 h-5 w-5 shrink-0", severity.iconClassName)} weight="fill" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {alert.title} <span className="ml-1 text-xs font-medium text-muted">{severity.label}</span>
              </p>
              <p className="mt-0.5 text-[13px] leading-5 text-text-secondary">{alert.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ChangeLabel({ change, upIsBad }: { change: MonitoringChange | null; upIsBad: boolean }) {
  if (!change) return <span className="text-xs text-muted">Chưa có kỳ trước</span>;
  const ChangeIcon = change.direction === "up" ? CaretUp : change.direction === "down" ? CaretDown : Minus;
  const worse = upIsBad && change.direction === "up";
  const better = upIsBad && change.direction === "down";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", worse ? "text-[var(--viz-delta-bad)]" : better ? "text-[var(--viz-delta-good)]" : "text-muted")}>
      <ChangeIcon className="h-3 w-3" weight="bold" />
      {change.text} so với kỳ trước
    </span>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: React.ReactNode }) {
  return (
    <Panel className="min-w-0 p-4">
      <p className="truncate text-[13px] font-medium text-text-secondary">{label}</p>
      <p className="mt-1 truncate text-xl font-bold tabular-nums text-foreground">{value}</p>
      <div className="mt-1 min-h-4">{note}</div>
    </Panel>
  );
}

function SummaryTiles({ data }: { data: MonitoringOverview }) {
  const { summary, previousSummary: previous } = data;
  const count = (value: number) => viNumber.format(value);
  const errorRate = summary.totalRequests ? (summary.serverErrors / summary.totalRequests) * 100 : 0;
  const change = (current: number | null, before: number | null | undefined, upIsBad = true) => <ChangeLabel change={compareWithPrevious(current, before)} upIsBad={upIsBad} />;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Tổng request" note={change(summary.totalRequests, previous?.totalRequests, false)} value={count(summary.totalRequests)} />
      <StatTile
        label="Lỗi hệ thống (5xx)"
        note={<span className="text-xs text-muted">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(errorRate)}% tổng request</span>}
        value={count(summary.serverErrors)}
      />
      <StatTile label="Bị từ chối (401, 403)" note={change(summary.deniedRequests, previous?.deniedRequests)} value={count(summary.deniedRequests)} />
      <StatTile label="Đăng nhập thất bại" note={change(summary.failedLogins, previous?.failedLogins)} value={count(summary.failedLogins)} />
      <StatTile
        label="Bị giới hạn tần suất (429)"
        note={<span className="text-xs text-muted">{data.rateLimitedRequests === null ? "Không đọc được bộ đếm" : "Tính theo giờ tròn"}</span>}
        value={data.rateLimitedRequests === null ? "—" : count(data.rateLimitedRequests)}
      />
      <StatTile label="Thời gian xử lý P95" note={change(summary.p95Ms, previous?.p95Ms)} value={formatDuration(summary.p95Ms)} />
      <StatTile label="Địa chỉ IP" note={change(summary.uniqueIps, previous?.uniqueIps, false)} value={count(summary.uniqueIps)} />
      <StatTile label="Tài khoản hoạt động" note={change(summary.uniqueAccounts, previous?.uniqueAccounts, false)} value={count(summary.uniqueAccounts)} />
    </div>
  );
}

const number = (value: number) => viNumber.format(value);

const IP_COLUMNS: Column<MonitoringIpActivity>[] = [
  { key: "ipAddress", label: "Địa chỉ IP", render: (row) => <span className="font-mono text-[13px]">{row.ipAddress}</span> },
  { key: "requests", label: "Request", align: "right", render: (row) => number(row.requests), sort: (row) => row.requests },
  { key: "accounts", label: "Tài khoản", align: "right", render: (row) => number(row.accounts), sort: (row) => row.accounts },
  { key: "errors", label: "Lỗi", align: "right", render: (row) => number(row.errors), sort: (row) => row.errors },
  { key: "deniedRequests", label: "Bị từ chối", align: "right", render: (row) => number(row.deniedRequests), sort: (row) => row.deniedRequests },
  { key: "failedLogins", label: "Đăng nhập sai", align: "right", render: (row) => number(row.failedLogins), sort: (row) => row.failedLogins },
  { key: "lastSeenAt", label: "Gần nhất", align: "right", render: (row) => formatMonitoringTime(row.lastSeenAt), sort: (row) => row.lastSeenAt },
];

const ACCOUNT_COLUMNS: Column<MonitoringAccountActivity>[] = [
  { key: "username", label: "Tài khoản", render: (row) => row.username },
  { key: "requests", label: "Request", align: "right", render: (row) => number(row.requests), sort: (row) => row.requests },
  { key: "ipAddresses", label: "Số IP", align: "right", render: (row) => number(row.ipAddresses), sort: (row) => row.ipAddresses },
  { key: "errors", label: "Lỗi", align: "right", render: (row) => number(row.errors), sort: (row) => row.errors },
  { key: "lastSeenAt", label: "Gần nhất", align: "right", render: (row) => formatMonitoringTime(row.lastSeenAt), sort: (row) => row.lastSeenAt },
];

const ENDPOINT_COLUMNS: Column<MonitoringEndpointActivity>[] = [
  {
    key: "path",
    label: "Đường dẫn API",
    render: (row) => (
      <span className="break-all font-mono text-[13px]">
        <span className="mr-2 font-semibold text-text-secondary">{row.method}</span>
        {row.path}
      </span>
    ),
  },
  { key: "requests", label: "Request", align: "right", render: (row) => number(row.requests), sort: (row) => row.requests },
  { key: "serverErrors", label: "Lỗi 5xx", align: "right", render: (row) => number(row.serverErrors), sort: (row) => row.serverErrors },
  { key: "p95Ms", label: "P95", align: "right", render: (row) => formatDuration(row.p95Ms), sort: (row) => row.p95Ms },
];

const endpointKey = (row: MonitoringEndpointActivity) => `${row.method} ${row.path}`;

export function MonitoringView() {
  const [hours, setHours] = useState<number>(24);
  const query = useQuery({
    queryKey: ["system", "monitoring", hours],
    queryFn: () => apiFetch<MonitoringOverview>(`/system/monitoring/overview?hours=${hours}`),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });
  const data = query.data;
  const rows = useMemo(() => timelineRows(data?.timeline ?? []), [data?.timeline]);
  const busy = query.isFetching && query.isPlaceholderData;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hệ thống" subtitle="Theo dõi lưu lượng API, lỗi và dấu hiệu bất thường. Số liệu tự làm mới mỗi phút." title="Giám sát hệ thống" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-label="Khoảng thời gian" className="flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1" role="group">
          {MONITORING_RANGES.map((range) => (
            <button
              aria-pressed={hours === range.hours}
              className={cn("h-9 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary", hours === range.hours ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-1")}
              key={range.hours}
              onClick={() => setHours(range.hours)}
              type="button"
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {data ? <span className="text-[13px] text-muted">Cập nhật lúc {formatMonitoringTime(data.generatedAt)}</span> : null}
          <button
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
          >
            <ArrowsClockwise className={cn("h-4 w-4", query.isFetching && "motion-safe:animate-spin")} weight="bold" />
            Làm mới
          </button>
        </div>
      </div>

      {query.isError && !data ? <ErrorState onRetry={() => void query.refetch()} /> : null}

      {!data && query.isPending ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiSkeletons count={8} />
          </div>
          <ChartSkeletonCard />
        </>
      ) : null}

      {data ? (
        <>
          {query.isError ? <p className="text-[13px] font-medium text-danger" role="status">Không làm mới được số liệu, đang hiển thị lần tải gần nhất.</p> : null}

          <AlertList alerts={data.alerts} />
          <SummaryTiles data={data} />

          <SectionCard busy={busy} description="Số request API theo thời gian." title="Lưu lượng">
            <TrendChart ariaLabel="Biểu đồ số request theo thời gian" height={280} rows={rows} series={[{ key: "requests", label: "Request", color: "var(--viz-1)" }]} variant="area" />
          </SectionCard>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <SectionCard busy={busy} description="Lỗi hệ thống và request bị từ chối." title="Lỗi và từ chối" tone="var(--viz-critical)">
              <TrendChart
                ariaLabel="Biểu đồ lỗi hệ thống và request bị từ chối theo thời gian"
                height={240}
                rows={rows}
                series={[
                  { key: "serverErrors", label: "Lỗi 5xx", color: "var(--viz-critical)" },
                  { key: "deniedRequests", label: "Bị từ chối", color: "var(--viz-4)" },
                ]}
              />
            </SectionCard>
            <SectionCard busy={busy} description="95% request xử lý xong trong khoảng thời gian này." title="Thời gian xử lý P95 (ms)" tone="var(--viz-7)">
              <TrendChart ariaLabel="Biểu đồ thời gian xử lý P95 theo thời gian" height={240} rows={rows} series={[{ key: "p95Ms", label: "P95 (ms)", color: "var(--viz-7)" }]} />
            </SectionCard>
          </div>

          <SectionCard
            busy={busy}
            description={data.ipDataReliable ? "Các địa chỉ gửi nhiều request nhất." : "Phần lớn là địa chỉ nội bộ, chưa phản ánh đúng từng người dùng."}
            title="Địa chỉ IP"
            tone="var(--viz-2)"
          >
            <DataTable ariaLabel="Địa chỉ IP gửi nhiều request nhất" columns={IP_COLUMNS} initialSort={{ key: "requests", direction: "desc" }} pageSize={8} rowKey={(row) => row.ipAddress} rows={data.topIps} />
          </SectionCard>

          <SectionCard busy={busy} description="Các tài khoản gửi nhiều request nhất." title="Tài khoản" tone="var(--viz-3)">
            <DataTable ariaLabel="Tài khoản gửi nhiều request nhất" columns={ACCOUNT_COLUMNS} initialSort={{ key: "requests", direction: "desc" }} pageSize={8} rowKey={(row) => row.username} rows={data.topAccounts} />
          </SectionCard>

          <SectionCard busy={busy} description="Đường dẫn được gọi nhiều nhất." title="API gọi nhiều nhất">
            <DataTable ariaLabel="API được gọi nhiều nhất" columns={ENDPOINT_COLUMNS} initialSort={{ key: "requests", direction: "desc" }} pageSize={8} rowKey={endpointKey} rows={data.busiestEndpoints} />
          </SectionCard>

          <SectionCard busy={busy} description="Chỉ tính đường dẫn có từ 5 request." title="API chậm nhất" tone="var(--viz-7)">
            <DataTable ariaLabel="API xử lý chậm nhất" columns={ENDPOINT_COLUMNS} initialSort={{ key: "p95Ms", direction: "desc" }} pageSize={8} rowKey={endpointKey} rows={data.slowestEndpoints} />
          </SectionCard>

          <p className="text-[13px] leading-5 text-muted">
            Số liệu gồm các request API đã vào tới hệ thống, không gồm request bị Cloudflare chặn trước đó. Nhật ký được lưu 10 ngày. Nếu hệ thống ngừng hoạt động, trang này cũng không truy cập được.
          </p>
        </>
      ) : null}
    </div>
  );
}
