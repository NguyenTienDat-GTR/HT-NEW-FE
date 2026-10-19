"use client";

import { ArrowLeft, PencilSimple } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { EmbeddedResourceProvider } from "@/components/common/resource/embedded-resource-context";
import { fillRoute } from "@/components/common/resource/resource-actions";
import { ResourceCell } from "@/components/common/resource/resource-format";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { findRoute, type RouteConfig } from "@/config/routes/routes";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction, hasPermissionPrefix } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { TrainingWorkflowResourceView } from "@/modules/training-workflow/components/training-workflow-resource-view";

// Quy trình huấn luyện của một khóa: mỗi tab dùng lại đúng màn hình/logic của menu cũ, lọc theo khóa đang chọn.
const workflowTabs = [
  { key: "registrations", label: "Đăng ký tham dự", path: "/training/registrations" },
  { key: "approvals", label: "Duyệt đăng ký", path: "/training/approvals" },
  { key: "participations", label: "Danh sách tham dự", path: "/training/participations" },
  { key: "scores", label: "Chấm điểm", path: "/training/scores" },
] as const;

const summaryColumns = ["courseTypeName", "hostYear", "yearsActive", "location", "startDate", "endDate", "registrationStatus", "organizingStatus"];

export function CourseDetailPage({ id, route }: { id: string; route: RouteConfig }) {
  const user = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();

  const courseQuery = useQuery({
    queryKey: ["resource-detail", route.endpoint, id],
    enabled: Boolean(route.endpoint && id),
    queryFn: () => apiFetch<Record<string, unknown>>(`${route.endpoint}/${encodeURIComponent(id)}`),
  });

  const tabs = useMemo(
    () =>
      workflowTabs.flatMap((tab) => {
        const tabRoute = findRoute(tab.path);
        if (!tabRoute) return [];
        if (tabRoute.permissionPrefixes.length && !tabRoute.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix))) return [];
        return [{ ...tab, route: tabRoute }];
      }),
    [user],
  );
  const activeTab = tabs.find((tab) => tab.key === searchParams.get("tab")) ?? tabs[0];
  const basePath = `/training/courses/${encodeURIComponent(id)}`;
  const editHref = fillRoute(route.editPath, { id });
  const course = courseQuery.data;

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
    <div className="space-y-5">
      <section className="space-y-3">
        <Link className="inline-flex items-center gap-2 text-xs font-semibold text-primary" href={route.path as Route}>
          <ArrowLeft size={16} />
          Quay lại danh sách khóa
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-[0] text-foreground">{courseQuery.isLoading ? "Đang tải..." : String(course?.courseName ?? id)}</h1>
          {editHref && canUseAction(user, route.actions?.edit) ? (
            <Button asChild variant="outline">
              <Link href={editHref as Route}>
                <PencilSimple size={16} />
                Sửa khóa
              </Link>
            </Button>
          ) : null}
        </div>
        {course ? (
          <Panel className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryColumns.map((column) => (
              <div className="min-w-0" key={column}>
                <p className="text-xs font-semibold uppercase tracking-[0.02em] text-muted">{summaryLabels[column] ?? column}</p>
                <div className="mt-1 text-sm text-foreground">
                  <ResourceCell column={column} row={course} value={course[column]} />
                </div>
              </div>
            ))}
          </Panel>
        ) : null}
      </section>

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
                    "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
                  )}
                  href={`${basePath}?tab=${tab.key}` as Route}
                  key={tab.key}
                  role="tab"
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
          {activeTab ? (
            <EmbeddedResourceProvider
              key={activeTab.key}
              value={{ basePath, tab: activeTab.key, fixedFilters: { "course.courseCode": id } }}
            >
              <TrainingWorkflowResourceView route={activeTab.route} />
            </EmbeddedResourceProvider>
          ) : null}
        </>
      )}
    </div>
  );
}

const summaryLabels: Record<string, string> = {
  courseTypeName: "Loại khóa",
  hostYear: "Năm tổ chức",
  yearsActive: "Số năm hoạt động",
  location: "Địa điểm",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  registrationStatus: "Trạng thái đăng ký",
  organizingStatus: "Trạng thái tổ chức",
};
