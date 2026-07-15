"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function SystemResourceView({ route }: { route: RouteConfig }) {
  const isAudit = route.kind === "audit-logs";
  const isNotification = route.kind === "notifications";
  return (
    <ResourceListPage
      route={route}
      moduleLabel={isNotification ? "Thông báo" : "Hệ thống"}
      moduleDescription="Quản trị tài khoản, vai trò, quyền hạn, thông báo và nhật ký hệ thống."
      tone={isAudit ? "blue" : "violet"}
    />
  );
}
