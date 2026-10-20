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
        bulkApprovePath: route.moduleName === "certificate.approval" ? "/certificates/bulk-approval" : undefined,
        buildBulkBody,
      }}
    />
  );
}

function buildApprovePath(_route: RouteConfig, _rows: Record<string, unknown>[], id: string, approved = true) {
  return `/certificates/${encodeURIComponent(id)}/${approved ? "approve" : "reject"}`;
}

function buildApproveBody(_route: RouteConfig, note?: string, approved = true) {
  return approved ? { approvalReason: note || undefined } : { reason: note || undefined };
}

function buildBulkBody(ids: string[], approved: boolean, note: string, reasons?: Record<string, string>) {
  return { ids, approved, reason: note || undefined, reasons };
}
