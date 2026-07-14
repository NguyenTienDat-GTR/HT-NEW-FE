"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function SystemResourceView({ route }: { route: RouteConfig }) {
  const isAudit = route.kind === "audit-logs";
  const isNotification = route.kind === "notifications";
  return (
    <ResourceListPage
      route={route}
      moduleLabel={isNotification ? "Thông báo" : "Hệ thống"}
      moduleDescription="Quản trị tài khoản, vai trò, quyền hạn, thông báo và nhật ký hệ thống."
      tone={isAudit ? "blue" : "violet"}
      buildSummary={systemSummary}
      sidePanel={
        <ModuleSidePanel
          title={isAudit ? "Nhật ký hệ thống" : "RBAC và phiên"}
          description={isAudit ? "Audit log chỉ kỳ vọng 10 ngày gần nhất." : "Menu và action lấy từ permissions hiện tại, không hardcode theo role duy nhất."}
          items={[
            { label: "Account", value: "Backend tự sinh credential" },
            { label: "Permission", value: "Đổi sau login/refresh" },
            { label: "Override", value: "ALLOW hoặc DENY trực tiếp" },
            { label: "Session", value: "Update/toggle/delete revoke ngay" },
          ]}
          tone={isAudit ? "blue" : "violet"}
        />
      }
    />
  );
}

function systemSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const active = rows.filter((row) => row.status === true).length;
  const unread = rows.filter((row) => row.readAt === null).length;
  const deny = rows.filter((row) => row.effect === "DENY").length;
  return [
    { label: "Tổng bản ghi", value: viNumber.format(data?.totalElements ?? 0), caption: "Theo quyền hệ thống" },
    { label: "Đang hoạt động", value: viNumber.format(active), caption: "Trong trang hiện tại", tone: "emerald" as const },
    { label: "Chưa đọc / DENY", value: viNumber.format(unread + deny), caption: "Tùy loại màn hình", tone: "amber" as const },
    { label: "Trang", value: viNumber.format((data?.number ?? 0) + 1), caption: `${viNumber.format(data?.totalPages ?? 1)} trang` },
  ];
}
