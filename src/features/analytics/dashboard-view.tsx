"use client";

import { ArrowRight, Bell, Certificate, ClipboardText, GraduationCap, TrendUp, UsersThree } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ChartFrame, ChartSkeleton } from "./chart-frame";
import { AnimatedMetric } from "./animated-metric";
import { metricLabel, toChartRows, toKpiList, type AnalyticsResponse } from "./types";

const workQueue = [
  {
    title: "Đăng ký chờ duyệt",
    description: "Rà soát hồ sơ theo cấp duyệt hiện tại.",
    href: "/training/approvals",
    icon: ClipboardText,
    tone: "rose",
  },
  {
    title: "Ban điều hành chờ duyệt",
    description: "Kiểm tra phân công và ngày hiệu lực.",
    href: "/executive-board/assignments",
    icon: UsersThree,
    tone: "blue",
  },
  {
    title: "Khóa sắp diễn ra",
    description: "Theo dõi cửa sổ đăng ký và công thức điểm.",
    href: "/training/courses",
    icon: GraduationCap,
    tone: "violet",
  },
  {
    title: "Chứng nhận chờ cấp",
    description: "Kiểm tra passing score và lý do ngoại lệ.",
    href: "/certificates/approvals",
    icon: Certificate,
    tone: "emerald",
  },
] as const;

const notifications = [
  "Khóa LHT Cấp I đã đăng ký khóa 2025B.",
  "Ban điều hành giáo xứ An Phú được duyệt.",
  "Phê duyệt chứng nhận cho 12 huynh trưởng.",
  "Khóa LHT 2025A đã kết thúc khóa học.",
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
      <Header title="Tổng quan" subtitle="Theo dõi hệ thống, công việc cần xử lý và dữ liệu analytics trong scope hiện tại." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((metric, index) => (
          <AnimatedMetric delay={index * 0.04} key={metric.key} label={metricLabel(metric.key)} value={metric.value} />
        ))}
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <div className="h-[150px] rounded-[16px] border border-border bg-white motion-safe:animate-pulse" key={index} />)
          : null}
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
            {notifications.map((item, index) => (
              <div className="flex items-center gap-3 rounded-[12px] px-2 py-3 hover:bg-surface-1" key={item}>
                <span className={cn("grid h-9 w-9 place-items-center rounded-full", index % 2 === 0 ? "bg-danger/10 text-danger" : "bg-blue-50 text-blue-600")}>
                  <Bell className="h-4 w-4" weight="bold" />
                </span>
                <span className="min-w-0 flex-1 text-sm text-foreground">{item}</span>
                <span className="text-xs text-muted">{index + 2} giờ trước</span>
              </div>
            ))}
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
          {workQueue.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                className="group rounded-[14px] border border-border bg-white p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/4"
                href={item.href as Route}
                key={item.href}
              >
                <span className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px]", queueTone(item.tone))}>
                  <Icon className="h-5 w-5" weight="bold" />
                </span>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-2xl font-semibold text-foreground">{[12, 5, 3, 8][index]}</span>
                    <span className="mt-1 block text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.description}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
              </Link>
            );
          })}
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

function queueTone(tone: (typeof workQueue)[number]["tone"]) {
  if (tone === "rose") return "bg-danger/10 text-danger";
  if (tone === "blue") return "bg-blue-50 text-blue-600";
  if (tone === "emerald") return "bg-success/10 text-success";
  return "bg-primary/10 text-primary";
}
