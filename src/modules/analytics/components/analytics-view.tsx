"use client";

import { Buildings, Certificate, GraduationCap, UsersThree } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useSessionState } from "@/lib/use-session-state";
import { cn } from "@/lib/utils";
import { CertificatesTab, CoursesTab, LeadersTab, OrganizationTab } from "@/modules/analytics/components/analysis-tabs";
import { FilterBar, type FilterVisibility } from "@/modules/analytics/components/filter-bar";
import { PageHeader } from "@/modules/analytics/components/page-header";
import { RecordsDrawer } from "@/modules/analytics/components/records-drawer";
import { ChartSkeletonCard, ErrorState, KpiSkeletons } from "@/modules/analytics/components/section-card";
import { useAnalytics, useFilterOptions, useScopes, type AnalyticsEndpoint, type DrillTarget } from "@/modules/analytics/queries";
import { defaultFilters, type AnalyticsFilterState } from "@/modules/analytics/types";

type TabId = Extract<AnalyticsEndpoint, "courses" | "certificates" | "leaders" | "organization">;

const TABS: { id: TabId; label: string; description: string; icon: typeof GraduationCap }[] = [
  { id: "courses", label: "Khóa huấn luyện", description: "Đăng ký, tham dự, đạt", icon: GraduationCap },
  { id: "certificates", label: "Chứng nhận", description: "Duyệt, chuyển đổi, tốc độ", icon: Certificate },
  { id: "leaders", label: "Huynh trưởng", description: "Cơ cấu, tuổi, cấp bậc", icon: UsersThree },
  { id: "organization", label: "Tổ chức", description: "Giáo hạt, giáo xứ", icon: Buildings },
];

// Bộ lọc nào có nghĩa với tab nào: ẩn bộ lọc không ảnh hưởng số liệu để người xem không chỉnh vô ích.
const VISIBLE: Record<TabId, FilterVisibility> = {
  courses: { course: true, leader: true, unit: true, groupBy: true, inactive: false, groupByValues: ["courseType", "course", "deanery", "parish", "leaderLevel", "gender", "year"] },
  certificates: { course: true, leader: true, unit: true, groupBy: true, inactive: false, groupByValues: ["courseType", "course", "deanery", "parish", "leaderLevel", "gender", "year"] },
  leaders: { course: false, leader: true, unit: true, groupBy: true, inactive: true, groupByValues: ["deanery", "parish", "leaderLevel", "gender", "year"] },
  organization: { course: false, leader: true, unit: true, groupBy: false, inactive: true },
};

const TAB_KEY = "analytics:tab:v2";
const FILTER_KEY = "analytics:filters:v2";

export function AnalyticsView() {
  const [rawTab, setTab] = useSessionState<TabId>(TAB_KEY, "courses");
  const [filters, setFilters] = useSessionState<AnalyticsFilterState>(FILTER_KEY, defaultFilters);
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const layoutId = useId();

  const scopes = useScopes();
  // Phạm vi đang xem: lựa chọn của người dùng, nếu chưa chọn thì phạm vi rộng nhất họ có quyền.
  const activeScope = filters.scope || scopes.data?.[0]?.type || "";
  // Giáo xứ không tổ chức khóa nên không có phân tích khóa huấn luyện: ẩn tab và chuyển sang tab hợp lệ đầu tiên.
  const visibleTabs = TABS.filter((item) => !(item.id === "courses" && activeScope === "parish"));
  const tab: TabId = visibleTabs.some((item) => item.id === rawTab) ? rawTab : visibleTabs[0].id;
  const query = useAnalytics(tab, filters, !scopes.isLoading);
  const options = useFilterOptions(activeScope, !scopes.isLoading);
  const data = query.data;
  const busy = query.isFetching;

  // Đổi tab có thể khiến groupBy cũ không còn hợp lệ: bỏ nó thay vì để BE trả nhóm rỗng.
  const changeTab = (next: TabId) => {
    const allowed = VISIBLE[next].groupByValues;
    if (filters.groupBy && (!allowed || !allowed.includes(filters.groupBy))) setFilters({ ...filters, groupBy: "" });
    setTab(next);
  };

  // Chọn nhóm mới thì cuộn tới mục phân tích theo nhóm khi dữ liệu về, để người dùng thấy ngay kết quả của lựa chọn.
  const pendingScroll = useRef(false);
  const groupKey = data?.filters.groupBy ?? "";
  useEffect(() => {
    if (!groupKey || !pendingScroll.current) return;
    pendingScroll.current = false;
    document.getElementById("grouped-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [groupKey, data]);
  const changeFilters = (next: AnalyticsFilterState) => {
    if (next.groupBy && next.groupBy !== filters.groupBy) pendingScroll.current = true;
    setFilters(next);
  };

  const common = data ? { data, filters, busy, onDrill: setDrill } : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Phân tích" subtitle="Khám phá khóa huấn luyện, chứng nhận, nhân sự và tổ chức theo thời gian, đơn vị và nhóm. Bấm vào biểu đồ để xem danh sách chi tiết." title="Phân tích dữ liệu" />

      <div aria-label="Nhóm phân tích" className={cn("grid gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm sm:grid-cols-2", visibleTabs.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")} role="tablist">
        {visibleTabs.map((item) => {
          const selected = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              aria-selected={selected}
              className={cn("relative cursor-pointer rounded-lg px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary", selected ? "text-primary" : "text-foreground hover:bg-surface-1")}
              key={item.id}
              onClick={() => changeTab(item.id)}
              role="tab"
              type="button"
            >
              {selected ? <motion.span className="absolute inset-0 rounded-lg border border-primary/30 bg-primary-soft" layoutId={`tab-${layoutId}`} transition={{ type: "spring", stiffness: 420, damping: 36 }} /> : null}
              <span className="relative flex items-center gap-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors", selected ? "bg-white text-primary shadow-sm" : "bg-surface-2 text-text-secondary")}>
                  <Icon className="h-[18px] w-[18px]" weight="bold" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={cn("block truncate text-xs", selected ? "text-text-secondary" : "text-muted")}>{item.description}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <FilterBar
        appliedRange={data?.filters}
        busy={busy}
        filters={filters}
        onChange={changeFilters}
        options={options.data}
        scope={data?.scope ?? activeScope}
        scopes={scopes.data}
        visible={VISIBLE[tab]}
      />

      {query.isError && !data ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : !common ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiSkeletons count={8} />
          </section>
          <ChartSkeletonCard />
        </div>
      ) : (
        <div className="analytics-rise" key={tab}>
          {tab === "courses" ? <CoursesTab {...common} /> : null}
          {tab === "certificates" ? <CertificatesTab {...common} /> : null}
          {tab === "leaders" ? <LeadersTab {...common} /> : null}
          {tab === "organization" ? <OrganizationTab {...common} /> : null}
        </div>
      )}

      <RecordsDrawer filters={filters} onClose={() => setDrill(null)} target={drill} />
    </div>
  );
}
