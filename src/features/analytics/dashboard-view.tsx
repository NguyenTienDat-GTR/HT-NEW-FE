"use client";

import { ArrowRight, Bell, Certificate, ClipboardText, GraduationCap, UsersThree } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { ChartFrame, ChartSkeleton } from "./chart-frame";
import { AnimatedMetric } from "./animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "./types";

const workQueue = [
  {
    title: "Đăng ký chờ duyệt",
    description: "Rà soát hồ sơ theo cấp duyệt hiện tại.",
    href: "/training/participations",
    icon: ClipboardText,
  },
  {
    title: "Chứng nhận chờ xử lý",
    description: "Kiểm tra passing score và lý do ngoại lệ.",
    href: "/certificates",
    icon: Certificate,
  },
  {
    title: "Khóa đang mở đăng ký",
    description: "Theo dõi cửa sổ đăng ký và recipient.",
    href: "/training/courses",
    icon: GraduationCap,
  },
  {
    title: "Hồ sơ huynh trưởng",
    description: "Cập nhật ảnh, thông tin liên hệ và trạng thái.",
    href: "/leaders",
    icon: UsersThree,
  },
];

export function DashboardView() {
  const query = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => apiFetch<AnalyticsResponse>("/analytics/overview"),
  });
  const rows = toChartRows(query.data);
  const metricKeys = Object.keys(rows[0] ?? {})
    .filter((key) => key !== "period")
    .slice(0, 3);
  const kpis = toKpiList(query.data).slice(0, 4);

  return (
    <div className="space-y-6">
      <Header
        eyebrow="dashboard"
        title="Tổng quan"
        subtitle="Theo dõi tình hình tổ chức, huynh trưởng, khóa học và chứng nhận trong scope hiện tại."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((metric, index) => (
          <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
        ))}
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <div className="h-[132px] rounded-[12px] bg-white motion-safe:animate-pulse" key={index} />)
          : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        {query.isLoading ? (
          <ChartSkeleton />
        ) : (
          <ChartFrame description="Trend và comparison dùng response analytics thật." metricKeys={metricKeys} rows={rows} title="Xu hướng tổng quan" />
        )}

        <Panel className="p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Việc cần xử lý</h2>
              <p className="mt-1 text-sm text-muted">Lối tắt theo các workflow vận hành thường dùng.</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
          </div>
          <div className="divide-y divide-surface-2">
            {workQueue.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="group flex items-center gap-3 py-3" href={item.href as Route} key={item.href}>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-1 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="line-clamp-1 text-xs text-muted">{item.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          title="Scope"
          value={String(query.data?.scope?.scopeType ?? query.data?.scope?.type ?? "Đang tải")}
          text="Backend tự resolve scope từ account, FE không gửi scopeId cho analytics."
        />
        <InsightCard
          title="Bộ lọc"
          value={String(query.data?.filters?.timeBucket ?? "month")}
          text="fromDate, toDate, timeBucket và groupBy được map thành chart controls."
        />
        <InsightCard title="Dữ liệu" value="Structured only" text="Analytics không trả insight/message diễn giải; FE tự map label hiển thị." />
      </section>
    </div>
  );
}

export function Header({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow ? (
        <div className="mb-2 inline-flex h-7 items-center rounded-full border border-border bg-white px-3 text-xs font-semibold text-muted">{eyebrow}</div>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-[0] text-foreground">{title}</h1>
      <p className="mt-1 max-w-[78ch] text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function InsightCard({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-semibold uppercase text-muted">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Panel>
  );
}
