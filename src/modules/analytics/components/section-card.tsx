"use client";

import { ArrowsClockwise, ChartLineUp, WarningCircle } from "@phosphor-icons/react";
import { useInView } from "motion/react";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

/** Section đã vào viewport chưa: biểu đồ nặng (recharts) chỉ dựng khi true để animation chạy đúng lúc người dùng nhìn thấy. */
const RevealContext = createContext(true);
export const useRevealed = () => useContext(RevealContext);

type SectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Đang tải lại: giữ nguyên khung và biểu đồ cũ ở độ mờ thấp, không nhảy bố cục. */
  busy?: boolean;
  /** Màu nhấn (biến CSS --viz-*) của thanh đầu mục. */
  tone?: string;
  /** Độ trễ vào khung (ms) để các section cùng hàng nối nhau thay vì bật cùng lúc. */
  delay?: number;
  /** Giữ tương thích: section nào cũng tự reveal khi cuộn tới. */
  defer?: boolean;
};

export function SectionCard({ title, description, actions, children, className, busy, tone = "var(--viz-1)", delay = 0 }: SectionCardProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  return (
    <Panel
      className={cn("analytics-reveal p-5 transition-shadow duration-200 hover:shadow-md sm:p-6", inView && "is-in", className)}
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : undefined }}
    >
      <RevealContext.Provider value={inView}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden className="mt-1 h-4 w-1 shrink-0 rounded-full" style={{ background: tone }} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-6 text-foreground">{title}</h2>
              {description ? <p className="mt-0.5 text-[13px] leading-5 text-muted">{description}</p> : null}
            </div>
          </div>
          {actions}
        </div>
        <div className={cn("mt-4 transition-opacity duration-200", busy && "opacity-55")} aria-busy={busy || undefined}>
          {children}
        </div>
      </RevealContext.Provider>
    </Panel>
  );
}

export function EmptyState({ title = "Chưa có dữ liệu trong bộ lọc này", hint = "Thử mở rộng khoảng thời gian hoặc bỏ bớt bộ lọc.", className }: { title?: string; hint?: string; className?: string }) {
  return (
    <div className={cn("grid min-h-[180px] place-items-center rounded-lg border border-dashed border-border bg-surface-1 px-6 py-8 text-center", className)}>
      <div>
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
          <ChartLineUp className="h-5 w-5" weight="bold" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[13px] text-muted">{hint}</p>
      </div>
    </div>
  );
}

export function ErrorState({ onRetry, message = "Không tải được số liệu. Vui lòng thử lại hoặc kiểm tra quyền truy cập." }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="grid min-h-[200px] place-items-center rounded-xl border border-danger/20 bg-[#fef2f2] p-8 text-center" role="alert">
      <div>
        <WarningCircle className="mx-auto h-8 w-8 text-danger" weight="bold" />
        <p className="mt-3 text-sm font-semibold text-foreground">{message}</p>
        {onRetry ? (
          <button className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50" onClick={onRetry} type="button">
            <ArrowsClockwise className="h-4 w-4" weight="bold" />
            Tải lại
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("analytics-shimmer rounded-lg", className)} style={style} />;
}

export function KpiSkeletons({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div className="min-h-[96px] rounded-xl border border-border bg-white p-4" key={index}>
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="mt-3 h-7 w-28" />
          <SkeletonBlock className="mt-3 h-3.5 w-36" />
        </div>
      ))}
    </>
  );
}

export function ChartSkeletonCard({ className }: { className?: string }) {
  return (
    <Panel className={cn("p-6", className)}>
      <SkeletonBlock className="h-5 w-48" />
      <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
      <SkeletonBlock className="mt-6 h-[260px] w-full" />
    </Panel>
  );
}
