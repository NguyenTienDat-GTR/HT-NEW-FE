"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowLeft, CaretDown, Flag, LockSimple, LockSimpleOpen, MagnifyingGlass, PencilSimple, Prohibit } from "@phosphor-icons/react";
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
import { CourseTeamsView } from "@/modules/training-teams/components/course-teams-view";
import { AutoSendBanner } from "@/modules/course-participants/components/auto-send-banner";
import { CourseParticipantsHub } from "@/modules/course-participants/components/course-participants-hub";
import { PrerequisiteCopyDialog } from "@/modules/prerequisite-copy/components/prerequisite-copy-dialog";
import { useSessionState } from "@/lib/use-session-state";
import { useIsDesktop } from "@/lib/use-media-query";
import { CourseConditionList, courseConditionItems } from "@/modules/training-courses/components/course-conditions";

// Quy trình huấn luyện của một khóa: mỗi tab dùng lại đúng màn hình/logic của menu cũ, lọc theo khóa đang chọn.
const workflowTabs = [
  { key: "registrations", label: "Đăng ký tham dự", path: "/training/registrations" },
  { key: "approvals", label: "Duyệt đăng ký", path: "/training/approvals" },
  { key: "participations", label: "Danh sách tham dự", path: "/training/participations" },
  { key: "teams", label: "Chia đội", path: "/training/teams" },
  // Thẻ tham dự, email thông tin tham dự và điểm danh bằng QR; dùng chung quyền xem danh sách tham dự.
  { key: "attendance", label: "Thẻ & điểm danh", path: "/training/participations" },
  { key: "scores", label: "Chấm điểm", path: "/training/scores" },
  { key: "certificate-approvals", label: "Duyệt chứng nhận", path: "/certificates/approvals" },
] as const;

// Thông tin khóa chia nhóm để dễ đọc. Khóa quá khứ: không có loại khóa, thời gian đăng ký, trạng thái và cấu hình.
type SummaryGroup = { title: string; columns: string[] };

const pastSummaryGroups: SummaryGroup[] = [
  { title: "Thông tin chung", columns: ["hostYear", "resultingLevelName", "passingScore", "location"] },
  { title: "Thời gian", columns: ["startDate", "endDate"] },
];

const summaryGroups: SummaryGroup[] = [
  { title: "Thông tin chung", columns: ["courseTypeName", "hostYear", "passingScore", "location", "targetDeaneries"] },
  { title: "Thời gian", columns: ["startDate", "endDate", "registrationPeriod"] },
  { title: "Trạng thái", columns: ["registrationStatus", "organizingStatus"] },
  { title: "Cấu hình", columns: ["autoApproveEligible", "scoreVisible", "attendanceEnabled", "autoSendInvitation"] },
];

export function CourseDetailPage({ id, route }: { id: string; route: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  // Ô tìm kiếm chung cho cả 5 tab: nằm dưới thông tin khóa, giữ nguyên nội dung khi đổi tab.
  const [searchText, setSearchText] = useSessionState(`course-search:${id}`, "");
  const firstSearch = useRef(true);
  const isDesktop = useIsDesktop();
  // Khối thông tin khóa thu gọn / mở rộng ở mọi thiết bị: mặc định mở trên desktop, thu gọn trên tablet và điện thoại cho đỡ chiếm màn hình.
  const [infoOverride, setInfoOverride] = useState<boolean | null>(null);
  const infoOpen = infoOverride ?? isDesktop;

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
  // Gửi email thông tin tham dự, quét và sửa điểm danh: người duyệt đăng ký đúng cấp quản lý khóa (BE kiểm tra lại theo đơn vị).
  const canManage = hasPermissionPrefix(user, "training.participation.approve.");
  // Quét / xác nhận điểm danh là quyền riêng theo phạm vi, tách khỏi quyền duyệt đăng ký.
  const canScan = hasPermissionPrefix(user, "training.attendance.scan.");
  // Khóa bị vô hiệu hóa: chỉ xem, mọi thao tác trong khóa bị chặn.
  const courseDisabled = course?.status === false;
  const isPastCourse = course?.pastCourse === true;
  const conditionItems = useMemo(() => courseConditionItems(course), [course]);
  const tabs = useMemo(
    () =>
      workflowTabs.flatMap((tab) => {
        // Khóa không có cấp độ đạt được thì không có chứng nhận nên không có tab duyệt chứng nhận.
        if (tab.key === "certificate-approvals" && course?.certificateRequired === false) return [];
        // Khóa quá khứ không có đăng ký, duyệt đăng ký và chấm điểm: chỉ có danh sách tham dự (import từ Excel) và duyệt chứng nhận.
        if (course?.pastCourse === true && tab.key !== "participations" && tab.key !== "certificate-approvals") return [];
        const tabRoute = findRoute(tab.path);
        if (!tabRoute) return [];
        if (tabRoute.permissionPrefixes.length && !tabRoute.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix))) return [];
        return [{ ...tab, route: tabRoute }];
      }),
    [user, course?.certificateRequired, course?.pastCourse],
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
    if (activeTab) router.replace(`${basePath}?tab=${activeTab.key}` as Route, { scroll: false });
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
            {isPastCourse ? (
              hasPermissionPrefix(user, "training.course.create_past.") && !courseDisabled ? (
                <Button asChild variant="outline">
                  <Link href={`/training/courses/past/${encodeURIComponent(id)}/edit` as Route}>
                    <PencilSimple size={16} />
                    Sửa khóa quá khứ
                  </Link>
                </Button>
              ) : null
            ) : editHref && canUseAction(user, route.actions?.edit) && !courseDisabled ? (
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
          <Panel className="px-4 py-3">
            <button
              aria-controls="course-info"
              aria-expanded={infoOpen}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-9"
              onClick={() => setInfoOverride(!infoOpen)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Thông tin khóa</span>
                {infoOpen ? null : (
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    <SummaryValue column="organizingStatus" course={course} /> · <SummaryValue column="startDate" course={course} /> → <SummaryValue column="endDate" course={course} />
                  </span>
                )}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                <span className="hidden sm:inline">{infoOpen ? "Thu gọn" : "Mở rộng"}</span>
                <CaretDown aria-hidden className={cn("transition-transform", infoOpen && "rotate-180")} size={16} />
              </span>
            </button>
            {infoOpen ? (
              <div className="mt-3 space-y-4" id="course-info">
                <div className={cn("grid gap-x-8 gap-y-4", isPastCourse ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4")}>
                  {(isPastCourse ? pastSummaryGroups : summaryGroups).map((group) => (
                    <section className="min-w-0" key={group.title}>
                      <h3 className="mb-2 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-[0.02em] text-text-secondary">{group.title}</h3>
                      <dl className="space-y-1.5">
                        {group.columns.filter((column) => column !== "targetDeaneries" || targetDeaneryNames(course).length > 0).map((column) => (
                          <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]" key={column}>
                            <dt className="shrink-0 text-muted">{summaryLabels[column] ?? column}</dt>
                            <dd className="min-w-0 text-right font-medium text-foreground">
                              <SummaryValue column={column} course={course} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
                {!isPastCourse ? (
                  <div className="border-t border-border pt-3">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">Điều kiện của khóa</h3>
                    {conditionItems.length > 0 ? <CourseConditionList items={conditionItems} /> : <p className="text-[13px] text-muted">Khóa không đặt điều kiện tham dự.</p>}
                  </div>
                ) : null}
              </div>
            ) : null}
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

      {course && course.autoSendInvitation === true && !isPastCourse && canManage && !courseDisabled && !course.finishedAt ? (
        <AutoSendBanner attendanceEnabled={course.attendanceEnabled === true} courseCode={id} courseName={String(course.courseName ?? id)} />
      ) : null}

      {tabs.length === 0 ? (
        <Panel className="p-6 text-sm text-muted">Bạn không có quyền xem quy trình huấn luyện của khóa này.</Panel>
      ) : (
        <>
          {isDesktop ? (
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
                    scroll={false}
                  >
                    {tab.label}
                    <TabCount active={active} count={tab.key !== "teams" && tab.key !== "attendance" ? tabCounts[tab.key] : undefined} />
                  </Link>
                );
              })}
            </div>
          ) : (
            // Tablet / điện thoại: các tab gộp thành một menu thả xuống để khỏi xuống dòng nhiều tầng.
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label="Chọn bước quy trình huấn luyện"
                  className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 text-left text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  type="button"
                >
                  <span className="min-w-0 truncate">
                    {activeTab?.label}
                    <TabCount active count={activeTab && activeTab.key !== "teams" && activeTab.key !== "attendance" ? tabCounts[activeTab.key] : undefined} />
                  </span>
                  <CaretDown aria-hidden className="shrink-0 text-muted" size={16} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" className="z-50 max-h-[70vh] w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-(--shadow-elevated) focus:outline-none" sideOffset={6}>
                  {tabs.map((tab) => {
                    const active = tab.key === activeTab?.key;
                    return (
                      <DropdownMenu.Item asChild key={tab.key}>
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center justify-between rounded-lg px-3 text-sm font-medium outline-none data-highlighted:bg-surface-hover",
                            active ? "bg-primary-soft text-primary" : "text-foreground",
                          )}
                          href={`${basePath}?tab=${tab.key}` as Route}
                          scroll={false}
                        >
                          {tab.label}
                          <TabCount active={active} count={tab.key !== "teams" && tab.key !== "attendance" ? tabCounts[tab.key] : undefined} />
                        </Link>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
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
                coursePast: course?.pastCourse === true,
                courseName: course && typeof course.courseName === "string" ? course.courseName : undefined,
              }}
            >
              {activeTab.key === "certificate-approvals" ? (
                <CertificateResourceView route={activeTab.route} />
              ) : activeTab.key === "teams" ? (
                <CourseTeamsView route={activeTab.route} />
              ) : activeTab.key === "attendance" && course ? (
                <CourseParticipantsHub
                  course={{
                    courseCode: id,
                    courseName: String(course.courseName ?? id),
                    attendanceEnabled: course.attendanceEnabled === true,
                    autoSendInvitation: course.autoSendInvitation === true,
                    disabled: courseDisabled,
                    finished: Boolean(course.finishedAt),
                    canManage,
                    canScan,
                  }}
                  search={search}
                />
              ) : activeTab.key === "participations" && canManage && !isPastCourse && !courseDisabled && course && !course.finishedAt ? (
                // Sao chép danh sách tham dự của khóa tiên quyết đã kết thúc: nút tự ẩn khi không có khóa nguồn.
                <TrainingWorkflowResourceView route={activeTab.route} toolbarActions={<PrerequisiteCopyDialog courseCode={id} />} />
              ) : (
                <TrainingWorkflowResourceView route={activeTab.route} />
              )}
            </EmbeddedResourceProvider>
          ) : null}
        </>
      )}
    </div>
  );
}

function TabCount({ active, count }: { active: boolean; count?: number }) {
  if (count === undefined) return null;
  return (
    <span className={cn("ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold", active ? "bg-primary-soft text-primary" : "bg-surface-2 text-text-secondary")}>
      {count}
    </span>
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
  if (column === "targetDeaneries") {
    return <span>{targetDeaneryNames(course).join(", ")}</span>;
  }
  if (column === "registrationPeriod") {
    const start = formatVietnamDateValue(typeof course.registrationStartAt === "string" ? course.registrationStartAt : null);
    const end = formatVietnamDateValue(typeof course.registrationEndAt === "string" ? course.registrationEndAt : null);
    return <span>{start || end ? `${start ?? "…"} → ${end ?? "…"}` : "Chưa có"}</span>;
  }
  return <ResourceCell column={column} row={course} value={course[column]} />;
}

// Giáo hạt mà khóa giáo phận (một đợt) dành cho; rỗng = mở cho tất cả.
function targetDeaneryNames(course: Record<string, unknown>): string[] {
  const items = Array.isArray(course.targetDeaneries) ? (course.targetDeaneries as { name?: string | null }[]) : [];
  return items.map((item) => item.name).filter((name): name is string => Boolean(name));
}

function scoringWindowHint(course: Record<string, unknown>) {
  const start = typeof course.startDate === "string" ? course.startDate : "";
  const end = typeof course.endDate === "string" ? course.endDate : "";
  return `Chỉ chấm điểm được khi khóa đang diễn ra${start || end ? ` (${start || "…"} → ${end || "…"})` : ""}.`;
}

const summaryLabels: Record<string, string> = {
  courseTypeName: "Loại khóa",
  targetDeaneries: "Dành cho giáo hạt",
  resultingLevelName: "Cấp độ đạt được",
  hostYear: "Năm tổ chức",
  passingScore: "Điểm đạt",
  autoApproveEligible: "Tự động duyệt hồ sơ hợp lệ",
  scoreVisible: "Hiển thị điểm của khóa",
  attendanceEnabled: "Bật điểm danh bằng QR",
  autoSendInvitation: "Tự gửi email khi duyệt",
  location: "Địa điểm",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  registrationPeriod: "Ngày đăng ký",
  registrationStatus: "Trạng thái đăng ký",
  organizingStatus: "Trạng thái tổ chức",
};
