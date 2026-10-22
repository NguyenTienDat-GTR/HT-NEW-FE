"use client";

import { ArrowLeft, Flag, LockSimple, LockSimpleOpen, MagnifyingGlass, PencilSimple, Prohibit } from "@phosphor-icons/react";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmbeddedResourceProvider } from "@/components/common/resource/embedded-resource-context";
import { fillRoute } from "@/components/common/resource/resource-actions";
import { ResourceCell } from "@/components/common/resource/resource-format";
import { formatVietnamDateValue } from "@/lib/date-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Tip } from "@/components/ui/tip";
import { ConfirmActionDialog } from "@/components/common/resource/confirm-action-dialog";
import { findRoute, type RouteConfig } from "@/config/routes/routes";
import { apiFetch, apiMutation, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction, hasPermissionPrefix } from "@/lib/auth/permissions";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import {
  isCourseWithinDates,
  organizingStateLabels,
  organizingStateTones,
  registrationStateLabels,
  registrationStateTones,
  resolveOrganizingState,
  resolveRegistrationState,
  type StatusTone,
} from "@/modules/training-courses/registration-state";
import { CertificateResourceView } from "@/modules/certificates/components/certificate-resource-view";
import { TrainingWorkflowResourceView } from "@/modules/training-workflow/components/training-workflow-resource-view";
import { useSessionState } from "@/lib/use-session-state";

// Quy trình huấn luyện của một khóa: mỗi tab dùng lại đúng màn hình/logic của menu cũ, lọc theo khóa đang chọn.
const workflowTabs = [
  { key: "registrations", label: "Đăng ký tham dự", path: "/training/registrations" },
  { key: "approvals", label: "Duyệt đăng ký", path: "/training/approvals" },
  { key: "participations", label: "Danh sách tham dự", path: "/training/participations" },
  { key: "scores", label: "Chấm điểm", path: "/training/scores" },
  { key: "certificate-approvals", label: "Duyệt chứng nhận", path: "/certificates/approvals" },
] as const;

const summaryColumns = ["courseTypeName", "hostYear", "yearsActive", "passingScore", "location", "startDate", "endDate", "registrationPeriod", "registrationStatus", "organizingStatus", "autoApproveEligible", "scoreVisible"];

export function CourseDetailPage({ id, route }: { id: string; route: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  // Ô tìm kiếm chung cho cả 5 tab: nằm dưới thông tin khóa, giữ nguyên nội dung khi đổi tab.
  const [searchText, setSearchText] = useSessionState(`course-search:${id}`, "");
  const firstSearch = useRef(true);

  const courseQuery = useQuery({
    queryKey: ["resource-detail", route.endpoint, id],
    enabled: Boolean(route.endpoint && id),
    queryFn: () => apiFetch<Record<string, unknown>>(`${route.endpoint}/${encodeURIComponent(id)}`),
    // Luôn tải lại khi vào trang để thấy ngay thay đổi vừa lưu ở form sửa khóa (ngày, trạng thái...).
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Khóa/mở chỉnh sửa điểm của khóa: admin giáo phận/giáo hạt có quyền lock (khóa thuộc phạm vi của mình).
  const canLockScore = hasPermissionPrefix(user, "training.participation.lock.");
  const lockScoreMutation = useMutation({
    mutationFn: (locked: boolean) => apiMutation(`${route.endpoint}/${encodeURIComponent(id)}/score-lock`, "PATCH", { locked }),
    onSuccess: async (_data, locked) => {
      toast.success(locked ? "Đã khóa chỉnh sửa điểm" : "Đã mở chỉnh sửa điểm");
      await queryClient.invalidateQueries({ queryKey: ["resource-detail", route.endpoint, id] });
    },
  });

  // Kết thúc khóa thủ công: chốt kết quả chung, thăng cấp hồ sơ đạt, khóa điểm.
  const canFinish = hasPermissionPrefix(user, "training.course.finish.");
  const [finishOpen, setFinishOpen] = useState(false);
  const finishMutation = useMutation({
    mutationFn: () => apiMutation(`${route.endpoint}/${encodeURIComponent(id)}/finish`, "POST"),
    onSuccess: async () => {
      toast.success("Đã kết thúc khóa huấn luyện");
      setFinishOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["resource-detail", route.endpoint, id] });
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const course = courseQuery.data;
  // Khóa bị vô hiệu hóa: chỉ xem, mọi thao tác trong khóa bị chặn.
  const courseDisabled = course?.status === false;
  const tabs = useMemo(
    () =>
      workflowTabs.flatMap((tab) => {
        // Khóa không có cấp độ đạt được thì không có chứng nhận nên không có tab duyệt chứng nhận.
        if (tab.key === "certificate-approvals" && course?.certificateRequired === false) return [];
        const tabRoute = findRoute(tab.path);
        if (!tabRoute) return [];
        if (tabRoute.permissionPrefixes.length && !tabRoute.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix))) return [];
        return [{ ...tab, route: tabRoute }];
      }),
    [user, course?.certificateRequired],
  );
  const activeTab = tabs.find((tab) => tab.key === searchParams.get("tab")) ?? tabs[0];

  // Số bản ghi của từng tab (tổng số dòng tab đó liệt kê, không tính ô tìm kiếm): dùng đúng endpoint và bộ lọc nền của tab.
  const tabCountQueries = useQueries({
    queries: tabs.map((tab) => ({
      queryKey: ["resource", tab.route.endpoint, "tab-count", id, tab.route.baseFilters ?? null],
      enabled: Boolean(tab.route.endpoint),
      queryFn: () =>
        apiFetch<PageResponse<Record<string, unknown>>>(
          `${tab.route.endpoint}?${serializeBaseSearch({ page: 0, size: 10, filters: { ...tab.route.baseFilters, "course.courseCode": id } }).toString()}`,
        ),
      placeholderData: keepPreviousData,
    })),
  });
  const tabCounts = Object.fromEntries(tabs.map((tab, index) => [tab.key, tabCountQueries[index]?.data?.totalElements]));
  const basePath = `/training/courses/${encodeURIComponent(id)}`;

  const search = useDebouncedValue(searchText).trim();

  // Đổi từ khóa thì về trang đầu của tab đang xem.
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    if (activeTab) router.replace(`${basePath}?tab=${activeTab.key}` as Route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const editHref = fillRoute(route.editPath, { id });

  if (courseQuery.isError) {
    return (
      <Panel className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">Không thể tải khóa huấn luyện</h1>
        <p className="mt-2 text-sm text-muted">{getApiErrorMessage(courseQuery.error)}</p>
        <Button asChild className="mt-5" variant="outline">
          <Link href={route.path as Route}>Quay lại</Link>
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <Link className="inline-flex items-center gap-2 text-xs font-semibold text-primary" href={route.path as Route}>
          <ArrowLeft size={16} />
          Quay lại danh sách khóa
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-7 tracking-[0] text-foreground">{courseQuery.isLoading ? "Đang tải..." : String(course?.courseName ?? id)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canFinish && course && !course.finishedAt && !courseDisabled ? (
              <Tip label="Kết thúc khóa, chốt kết quả và thăng cấp các hồ sơ đạt">
                <Button onClick={() => setFinishOpen(true)} type="button" variant="outline">
                  <Flag size={16} />
                  Kết thúc khóa
                </Button>
              </Tip>
            ) : null}
            {canLockScore && course && !course.finishedAt && !courseDisabled ? (
              <Button
                className={course.scoreLocked === true ? undefined : "border-success text-success hover:border-success hover:bg-success/10 hover:text-success"}
                loading={lockScoreMutation.isPending}
                onClick={() => lockScoreMutation.mutate(course.scoreLocked !== true)}
                type="button"
                variant={course.scoreLocked === true ? "destructive" : "outline"}
              >
                {course.scoreLocked === true ? <LockSimpleOpen size={16} /> : <LockSimple size={16} />}
                {course.scoreLocked === true ? "Mở chỉnh sửa điểm" : "Khóa chỉnh sửa điểm"}
              </Button>
            ) : null}
            {editHref && canUseAction(user, route.actions?.edit) && !courseDisabled ? (
              <Button asChild variant="outline">
                <Link href={editHref as Route}>
                  <PencilSimple size={16} />
                  Sửa khóa
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        {course ? (
          <Panel className="flex flex-wrap gap-x-7 gap-y-1.5 px-4 py-3">
            {summaryColumns.map((column) => (
              <div className="flex min-w-0 items-baseline gap-1.5 text-[13px]" key={column}>
                <span className="shrink-0 text-muted">{summaryLabels[column] ?? column}:</span>
                <span className="min-w-0 font-medium text-foreground">
                  <SummaryValue column={column} course={course} />
                </span>
              </div>
            ))}
          </Panel>
        ) : null}
        {courseDisabled ? (
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-foreground" role="alert">
            <Prohibit className="mt-0.5 shrink-0 text-danger" size={18} weight="bold" />
            <p>
              <span className="font-semibold">Khóa huấn luyện đã bị vô hiệu hóa.</span> Chỉ xem được, không thể thao tác bất cứ gì trong khóa. Các chứng nhận đã duyệt đã bị thu hồi; bật lại khóa ở danh sách khóa để mở lại
              các chứng nhận đó.
            </p>
          </div>
        ) : null}
        <label className="relative block max-w-md">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="h-10 pl-9"
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm theo tên huynh trưởng, giáo hạt, giáo xứ"
            value={searchText}
          />
        </label>
      </section>

      <ConfirmActionDialog
        action="toggle"
        confirmLabel="Kết thúc khóa"
        description="Khóa sẽ chuyển sang đã kết thúc và điểm bị khóa. Hồ sơ có kết quả chưa đạt, chứng nhận chưa được duyệt hoặc bị từ chối sẽ có kết quả chung là không đạt và không được thăng cấp; các hồ sơ còn lại là đạt và được thăng cấp theo cấu hình của khóa. Không thể hoàn tác."
        loading={finishMutation.isPending}
        onClose={() => setFinishOpen(false)}
        onConfirm={() => finishMutation.mutate()}
        open={finishOpen}
        requireConfirmText={false}
        title="Kết thúc khóa huấn luyện"
      />

      {tabs.length === 0 ? (
        <Panel className="p-6 text-sm text-muted">Bạn không có quyền xem quy trình huấn luyện của khóa này.</Panel>
      ) : (
        <>
          <div aria-label="Quy trình huấn luyện" className="flex flex-wrap gap-1 border-b border-border" role="tablist">
            {tabs.map((tab) => {
              const active = tab.key === activeTab?.key;
              return (
                <Link
                  aria-selected={active}
                  className={cn(
                    "-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                    active ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-foreground",
                  )}
                  href={`${basePath}?tab=${tab.key}` as Route}
                  key={tab.key}
                  role="tab"
                >
                  {tab.label}
                  {tabCounts[tab.key] !== undefined ? (
                    <span className={cn("ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold", active ? "bg-primary-soft text-primary" : "bg-surface-2 text-text-secondary")}>
                      {tabCounts[tab.key]}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
          {activeTab ? (
            <EmbeddedResourceProvider
              key={activeTab.key}
              value={{
                basePath,
                tab: activeTab.key,
                fixedFilters: { "course.courseCode": id },
                search,
                scoringOpen: course ? isCourseWithinDates(course) : undefined,
                scoringHint: course ? scoringWindowHint(course) : undefined,
                scoreLocked: course ? course.scoreLocked === true : undefined,
                courseFinished: course ? Boolean(course.finishedAt) : undefined,
                courseDisabled,
              }}
            >
              {activeTab.key === "certificate-approvals" ? <CertificateResourceView route={activeTab.route} /> : <TrainingWorkflowResourceView route={activeTab.route} />}
            </EmbeddedResourceProvider>
          ) : null}
        </>
      )}
    </div>
  );
}

const toneTextClass: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  neutral: "text-muted",
};

// Thông tin chung dùng chữ thường (trạng thái chỉ đổi màu chữ, không dùng badge).
function SummaryValue({ column, course }: { column: string; course: Record<string, unknown> }) {
  if (column === "registrationStatus") {
    const state = resolveRegistrationState(course);
    return <span className={toneTextClass[registrationStateTones[state]]}>{registrationStateLabels[state]}</span>;
  }
  if (column === "organizingStatus") {
    const state = resolveOrganizingState(course);
    return <span className={toneTextClass[organizingStateTones[state]]}>{organizingStateLabels[state]}</span>;
  }
  if (column === "registrationPeriod") {
    const start = formatVietnamDateValue(typeof course.registrationStartAt === "string" ? course.registrationStartAt : null);
    const end = formatVietnamDateValue(typeof course.registrationEndAt === "string" ? course.registrationEndAt : null);
    return <span>{start || end ? `${start ?? "…"} → ${end ?? "…"}` : "Chưa có"}</span>;
  }
  return <ResourceCell column={column} row={course} value={course[column]} />;
}

function scoringWindowHint(course: Record<string, unknown>) {
  const start = typeof course.startDate === "string" ? course.startDate : "";
  const end = typeof course.endDate === "string" ? course.endDate : "";
  return `Chỉ chấm điểm được khi khóa đang diễn ra${start || end ? ` (${start || "…"} → ${end || "…"})` : ""}.`;
}

const summaryLabels: Record<string, string> = {
  courseTypeName: "Loại khóa",
  hostYear: "Năm tổ chức",
  yearsActive: "Số năm hoạt động",
  passingScore: "Điểm đạt",
  autoApproveEligible: "Tự động duyệt hồ sơ hợp lệ",
  scoreVisible: "Hiển thị điểm của khóa",
  location: "Địa điểm",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  registrationPeriod: "Ngày đăng ký",
  registrationStatus: "Trạng thái đăng ký",
  organizingStatus: "Trạng thái tổ chức",
};
