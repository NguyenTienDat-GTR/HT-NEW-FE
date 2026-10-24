"use client";

import type { ReactNode } from "react";
import { getResourceId } from "@/components/common/resource/resource-actions";
import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { ResourceListModuleConfig } from "@/components/common/resource/resource-list-types";
import type { RouteConfig } from "@/config/routes/routes";

export function TrainingWorkflowResourceView({ route, toolbarActions, exportEndpoint, cellEditors }: { route: RouteConfig; toolbarActions?: ReactNode; exportEndpoint?: string; cellEditors?: ResourceListModuleConfig["cellEditors"] }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Quy trình huấn luyện",
        moduleDescription: "Theo dõi đăng ký, duyệt, tham dự và chấm điểm theo trạng thái workflow.",
        toolbarActions,
        exportEndpoint,
        cellEditors,
        buildApprovePath,
        buildApproveBody,
        // Hồ sơ ngoại lệ: người duyệt chọn cấp độ đạt được sau khi hoàn thành khóa.
        exceptionLevel: true,
        scoreEntry: route.moduleName === "training.score",
        bulkApprovePath: route.moduleName === "training.approval" ? "/training/registrations/bulk-approval" : undefined,
        buildRemovePath: (id) => `/training/participants/${encodeURIComponent(id)}`,
        buildWithdrawPath: (id) => `/training/registrations/${encodeURIComponent(id)}`,
      }}
    />
  );
}

function buildApprovePath(route: RouteConfig, rows: Record<string, unknown>[], id: string) {
  const row = rows.find((candidate) => getResourceId(route, candidate) === id);
  if (row?.managementUnitType === "DEANERY") return `/training/registrations/${encodeURIComponent(id)}/deanery-approval`;
  return `/training/registrations/${encodeURIComponent(id)}/diocese-approval`;
}

function buildApproveBody(_route: RouteConfig, note?: string, approved = true, _signer?: unknown, achievedLevel?: string) {
  return { approved, review: note || undefined, achievedLevel: approved ? achievedLevel : undefined };
}
