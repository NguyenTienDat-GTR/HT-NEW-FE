"use client";

import { getResourceId } from "@/components/common/resource/resource-actions";
import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";

export function TrainingWorkflowResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Quy trình huấn luyện",
        moduleDescription: "Theo dõi đăng ký, duyệt, tham dự và chấm điểm theo trạng thái workflow.",
        buildApprovePath,
        buildApproveBody,
      }}
    />
  );
}

function buildApprovePath(route: RouteConfig, rows: Record<string, unknown>[], id: string) {
  const row = rows.find((candidate) => getResourceId(route, candidate) === id);
  const deaneryStatus = String(row?.deaneryApprovalStatus ?? "");
  if (deaneryStatus === "PENDING" || deaneryStatus === "SUBMITTED") return `/training/registrations/${encodeURIComponent(id)}/deanery-approval`;
  return `/training/registrations/${encodeURIComponent(id)}/diocese-approval`;
}

function buildApproveBody(_route: RouteConfig, note?: string) {
  return { approved: true, review: note || undefined };
}
