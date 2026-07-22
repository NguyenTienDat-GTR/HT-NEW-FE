"use client";

import { DashboardView } from "@/modules/dashboard/components/dashboard-view";
import { AnalyticsView } from "@/modules/analytics/components/analytics-view";
import { ResourceFormPage } from "@/components/form/resource-form/resource-form-page";
import type React from "react";
import { Panel } from "@/components/ui/panel";
import type { AuthUser } from "@/lib/auth/auth-store";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import { matchRoute } from "@/config/routes/routes";
import { ModuleResourceRenderer } from "./module-resource-renderer";

export function WorkspacePage({ segments }: { segments: string[] }) {
  const user = useAuthStore((state) => state.user);
  const path = `/${segments.join("/")}`;
  const match = matchRoute(path);
  if (!match) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">Không tìm thấy màn hình</div>
    );
  }
  const route = match.route;
  if (user?.unitLocked && route.path !== "/notifications") {
    return null;
  }
  const canReadRoute =
    !isHiddenForSuperAdmin(route, user) &&
    (!route.permissionPrefixes.length || route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix)));

  let content: React.ReactNode;
  if (!canReadRoute && match.type === "list") {
    content = (
      <Panel className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">403</h1>
        <p className="mt-2 text-sm text-muted">Bạn không có quyền truy cập màn hình này.</p>
      </Panel>
    );
  } else if (match.type === "create") content = <ResourceFormPage mode="create" route={route} />;
  else if (match.type === "edit") content = <ResourceFormPage id={match.params.id} mode="edit" route={route} />;
  else if (match.type === "score") content = <ResourceFormPage actionType="score" id={match.params.id} mode="edit" route={route} />;
  else if (route.kind === "dashboard") content = <DashboardView />;
  else if (route.kind === "analytics") content = <AnalyticsView />;
  else content = <ModuleResourceRenderer route={route} />;

  return content;
}

function isHiddenForSuperAdmin(route: { moduleName: string }, user: AuthUser | null) {
  if (!isSuperAdmin(user)) return false;
  return (
    route.moduleName.startsWith("leader.") ||
    route.moduleName.startsWith("executive-board.") ||
    route.moduleName.startsWith("training.") ||
    route.moduleName.startsWith("training-workflow.") ||
    route.moduleName.startsWith("certificate.")
  );
}
