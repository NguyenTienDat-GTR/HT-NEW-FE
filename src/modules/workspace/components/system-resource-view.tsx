"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";
import { NotificationInbox } from "@/modules/notifications/components/notification-inbox";

export function SystemResourceView({ route }: { route: RouteConfig }) {
  const isNotification = route.kind === "notifications";
  if (isNotification) return <NotificationInbox />;
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: isNotification ? "Thông báo" : "Hệ thống",
        moduleDescription: "Quản trị tài khoản, vai trò, quyền hạn, thông báo và nhật ký hệ thống.",
      }}
    />
  );
}
