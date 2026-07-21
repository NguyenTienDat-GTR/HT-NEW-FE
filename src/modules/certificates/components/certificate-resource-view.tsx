"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";

export function CertificateResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Chứng nhận",
        moduleDescription: "Quản lý chứng nhận, duyệt ngoại lệ và promotion sau khi hồ sơ đã chấm điểm.",
        buildApprovePath,
        buildApproveBody,
      }}
    />
  );
}

function buildApprovePath(_route: RouteConfig, _rows: Record<string, unknown>[], id: string) {
  return `/certificates/${encodeURIComponent(id)}/approve`;
}

function buildApproveBody(_route: RouteConfig, note?: string) {
  return { approvalReason: note || undefined };
}
