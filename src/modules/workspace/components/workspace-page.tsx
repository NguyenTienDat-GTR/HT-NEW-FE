"use client";

import dynamic from "next/dynamic";
import { DashboardView } from "@/modules/dashboard/components/dashboard-view";
import type React from "react";
import { Panel } from "@/components/ui/panel";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canReadRoute } from "@/lib/auth/permissions";
import { findRoute, matchRoute } from "@/config/routes/routes";
import type { RouteConfig } from "@/config/routes/routes";
import { resolveWorkspaceView, type WorkspaceViewKey } from "@/modules/workspace/view-resolution";
import { PROFILE_PATH } from "@/modules/account/account-display";

// Mỗi màn (trừ tổng quan) tải bằng chunk riêng và chỉ chạy ở trình duyệt: JS ban đầu nhẹ, không phải
// tải trình thiết kế chứng nhận, biểu đồ... khi chưa mở tới. Dùng chung khung chờ.
function ViewSkeleton() {
  return <div className="h-[420px] rounded-xl border border-border bg-white motion-safe:animate-pulse" />;
}
const AnalyticsView = dynamic(() => import("@/modules/analytics/components/analytics-view").then((m) => m.AnalyticsView), { ssr: false, loading: () => <ViewSkeleton /> });
const LeaderDetailPage = dynamic(() => import("@/modules/leaders/components/leader-detail-page").then((m) => m.LeaderDetailPage), { ssr: false, loading: () => <ViewSkeleton /> });
const CourseDetailPage = dynamic(() => import("@/modules/training-courses/components/course-detail-page").then((m) => m.CourseDetailPage), { ssr: false, loading: () => <ViewSkeleton /> });
const ResourceFormPage = dynamic(() => import("@/components/form/resource-form/resource-form-page").then((m) => m.ResourceFormPage), { ssr: false, loading: () => <ViewSkeleton /> });
const CertificateDetailPage = dynamic(() => import("@/modules/certificates/components/certificate-detail-page").then((m) => m.CertificateDetailPage), { ssr: false, loading: () => <ViewSkeleton /> });
const CertificateConfigView = dynamic(() => import("@/modules/certificates/components/certificate-config-view").then((m) => m.CertificateConfigView), { ssr: false, loading: () => <ViewSkeleton /> });
const CrossDeaneryView = dynamic(() => import("@/modules/cross-deanery/components/cross-deanery-view").then((m) => m.CrossDeaneryView), { ssr: false, loading: () => <ViewSkeleton /> });
const BadgeConfigView = dynamic(() => import("@/modules/badges/components/badge-config-view").then((m) => m.BadgeConfigView), { ssr: false, loading: () => <ViewSkeleton /> });
const MyPermissionsView = dynamic(() => import("@/modules/permissions/components/my-permissions-view").then((m) => m.MyPermissionsView), { ssr: false, loading: () => <ViewSkeleton /> });
const LeaderLevelsView = dynamic(() => import("@/modules/leader-levels/components/leader-levels-view").then((m) => m.LeaderLevelsView), { ssr: false, loading: () => <ViewSkeleton /> });
const MyProfilePage = dynamic(() => import("@/modules/account/components/my-profile-page").then((m) => m.MyProfilePage), { ssr: false, loading: () => <ViewSkeleton /> });
const ModuleResourceRenderer = dynamic(() => import("./module-resource-renderer").then((m) => m.ModuleResourceRenderer), { ssr: false, loading: () => <ViewSkeleton /> });

export function WorkspacePage({ segments }: { segments: string[] }) {
  const user = useAuthStore((state) => state.user);
  const path = `/${segments.join("/")}`;
  // Hồ sơ cá nhân: ai đăng nhập cũng xem được hồ sơ của chính mình, không cần quyền đọc Huynh Trưởng.
  if (path === PROFILE_PATH) return <MyProfilePage />;
  const match = matchRoute(path);
  // Đích khi quét mã QR: /certificates/{mã chứng nhận}. Cần đăng nhập (AuthGate) và quyền xem chứng nhận.
  if (!match && segments.length === 2 && segments[0] === "certificates") {
    const listRoute = findRoute("/certificates");
    const allowed = Boolean(listRoute) && listRoute!.permissionPrefixes.length > 0 && canReadRoute(listRoute!, user);
    if (user?.unitLocked) return null;
    if (!allowed) {
      return (
        <Panel className="p-6">
          <h1 className="text-2xl font-semibold text-foreground">403</h1>
          <p className="mt-2 text-sm text-muted">Bạn không có quyền xem chứng nhận.</p>
        </Panel>
      );
    }
    return <CertificateDetailPage code={decodeURIComponent(segments[1] ?? "")} />;
  }
  if (!match) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">Không tìm thấy màn hình</div>
    );
  }
  const route = match.route;
  if (user?.unitLocked && route.path !== "/notifications") {
    return null;
  }
  const routeReadable = canReadRoute(route, user);

  let content: React.ReactNode;
  if (!routeReadable && (match.type === "list" || match.type === "detail")) {
    content = (
      <Panel className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">403</h1>
        <p className="mt-2 text-sm text-muted">Bạn không có quyền truy cập màn hình này.</p>
      </Panel>
    );
  } else {
    content = renderWorkspaceView(resolveWorkspaceView(match.type, route), route, match.params);
  }

  return content;
}

// Bảng tra "khóa view -> màn hình": thêm màn mới chỉ cần thêm khóa ở view-resolution và một dòng ở đây.
function renderWorkspaceView(view: WorkspaceViewKey, route: RouteConfig, params: Record<string, string>): React.ReactNode {
  switch (view) {
    case "leader-detail":
      return <LeaderDetailPage id={params.id} route={route} />;
    case "course-detail":
      return <CourseDetailPage id={params.id} route={route} />;
    case "form-create":
      return <ResourceFormPage mode="create" route={route} />;
    case "form-edit":
      return <ResourceFormPage id={params.id} mode="edit" route={route} />;
    case "form-revoke":
      return <ResourceFormPage actionType="revoke" mode="create" route={route} />;
    case "form-score":
      return <ResourceFormPage actionType="score" id={params.id} mode="edit" route={route} />;
    case "dashboard":
      return <DashboardView />;
    case "analytics":
      return <AnalyticsView />;
    case "certificate-config":
      return <CertificateConfigView route={route} />;
    case "cross-deanery":
      return <CrossDeaneryView />;
    case "badge-config":
      return <BadgeConfigView route={route} />;
    case "leader-levels":
      return <LeaderLevelsView route={route} />;
    case "my-permissions":
      return <MyPermissionsView />;
    case "resource":
      return <ModuleResourceRenderer route={route} />;
  }
}
