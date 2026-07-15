"use client";

import { ArrowRight, Bell, Certificate, ClipboardText, GraduationCap, TrendUp } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ChartFrame, ChartSkeleton } from "./chart-frame";
import { AnimatedMetric } from "./animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "./types";

type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
};

type WorkQueueItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  count: number;
  icon: "registrations" | "scoring" | "courses" | "certificates";
  tone: "rose" | "blue" | "violet" | "emerald";
};

export function DashboardView() {
  const query = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => apiFetch<AnalyticsResponse>("/analytics/overview"),
  });
  const notificationsQuery = useQuery({
    queryKey: ["system", "notifications", "dashboard"],
    queryFn: () => apiFetch<NotificationItem[]>("/system/notifications"),
  });
  const workQueueQuery = useQuery({
    queryKey: ["analytics", "work-queue"],
    queryFn: () => apiFetch<WorkQueueItem[]>("/analytics/work-queue"),
  });

  const rows = toChartRows(query.data);
  const metricKeys = Object.keys(rows[0] ?? {})
    .filter((key) => key !== "period")
    .slice(0, 3);
  const kpis = toKpiList(query.data).slice(0, 4);

  return (
    <div className="space-y-6">
      <Header title="Tổng quan" subtitle="Theo dõi hệ thống, công việc cần xử lý và dữ liệu analytics trong scope hiện tại." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((metric, index) => (
          <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
        ))}
        {query.isLoading ? Array.from({ length: 4 }).map((_, index) => <div className="h-[150px] rounded-[16px] border border-border bg-white motion-safe:animate-pulse" key={index} />) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        {query.isLoading ? (
          <ChartSkeleton />
        ) : (
          <ChartFrame description="Dữ liệu lấy từ response analytics, FE tự map key thành label hiển thị." metricKeys={metricKeys} rows={rows} title="Khóa huấn luyện theo thời gian" />
        )}

        <Panel className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Thông báo mới</h2>
              <p className="mt-1 text-sm text-muted">Các sự kiện workflow gần đây.</p>
            </div>
            <Link className="text-sm font-semibold text-primary" href="/notifications">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-2">
            {(notificationsQuery.data ?? []).slice(0, 4).map((item, index) => (
              <div className="flex items-center gap-3 rounded-[12px] px-2 py-3 hover:bg-surface-1" key={item.id}>
                <span className={cn("grid h-9 w-9 place-items-center rounded-full", index % 2 === 0 ? "bg-danger/10 text-danger" : "bg-blue-50 text-blue-600")}>
                  <Bell className="h-4 w-4" weight="bold" />
                </span>
                <span className="min-w-0 flex-1 text-sm text-foreground">{item.title}</span>
                <span className="text-xs text-muted">{item.readAt ? "Đã đọc" : "Mới"}</span>
              </div>
            ))}
            {!notificationsQuery.isLoading && !notificationsQuery.data?.length ? <p className="rounded-[10px] bg-surface-1 p-3 text-sm text-muted">Chưa có thông báo mới.</p> : null}
          </div>
        </Panel>
      </section>

      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Việc cần xử lý</h2>
            <p className="mt-1 text-sm text-muted">Lối tắt theo các workflow vận hành thường dùng.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <TrendUp className="h-4 w-4" />
            Ưu tiên hôm nay
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(workQueueQuery.data ?? []).map((item) => {
            const Icon = queueIcon(item.icon);
            return (
              <Link className="group rounded-[14px] border border-border bg-white p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/4" href={item.href as Route} key={item.key}>
                <span className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px]", queueTone(item.tone))}>
                  <Icon className="h-5 w-5" weight="bold" />
                </span>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-2xl font-semibold text-foreground">{item.count}</span>
                    <span className="mt-1 block text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.description}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
              </Link>
            );
          })}
          {!workQueueQuery.isLoading && !workQueueQuery.data?.length ? <p className="text-sm text-muted">Không có việc cần xử lý theo scope hiện tại.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

export function Header({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow ? <div className="mb-2 inline-flex h-8 items-center rounded-full border border-border bg-white px-3 text-xs font-semibold text-muted">{eyebrow}</div> : null}
      <h1 className="text-3xl font-semibold tracking-[0] text-foreground">{title}</h1>
      <p className="mt-2 max-w-[78ch] text-base text-muted">{subtitle}</p>
    </div>
  );
}

function queueIcon(icon: WorkQueueItem["icon"]) {
  if (icon === "certificates") return Certificate;
  if (icon === "courses") return GraduationCap;
  return ClipboardText;
}

function queueTone(tone: WorkQueueItem["tone"]) {
  if (tone === "rose") return "bg-danger/10 text-danger";
  if (tone === "blue") return "bg-blue-50 text-blue-600";
  if (tone === "emerald") return "bg-success/10 text-success";
  return "bg-primary/10 text-primary";
}
