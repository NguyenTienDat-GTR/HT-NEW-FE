"use client";

import type { ReactNode } from "react";
import { useEmbeddedResource } from "@/components/common/resource/embedded-resource-context";
import { getResourceId } from "@/components/common/resource/resource-actions";
import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { ResourceListModuleConfig } from "@/components/common/resource/resource-list-types";
import type { RouteConfig } from "@/config/routes/routes";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { RegistrationNoteCell } from "./registration-note-cell";

// Các màn có cột Ghi chú đăng ký sửa tại chỗ: đăng ký, duyệt đăng ký, danh sách tham dự.
const NOTE_ROUTES = new Set(["training.registration", "training.approval", "training.participation"]);

export function TrainingWorkflowResourceView({ route, toolbarActions, exportEndpoint, cellEditors }: { route: RouteConfig; toolbarActions?: ReactNode; exportEndpoint?: string; cellEditors?: ResourceListModuleConfig["cellEditors"] }) {
  const user = useAuthStore((state) => state.user);
  const embedded = useEmbeddedResource();
  // Người duyệt đúng đơn vị sở hữu khóa sửa mọi hồ sơ; người gửi sửa hồ sơ của mình khi còn chờ duyệt (BE kiểm tra lại). Khóa kết thúc / vô hiệu hóa thì chỉ xem.
  const approver = hasPermissionPrefix(user, "training.participation.approve.");
  const locked = embedded?.courseFinished === true || embedded?.courseDisabled === true;
  const noteEditor =
    route.moduleName && NOTE_ROUTES.has(route.moduleName)
      ? {
          registrationNote: (row: Record<string, unknown>) => {
            const pending = row.approvalStatus === "PENDING" || row.approvalStatus === "SUBMITTED";
            const sender = hasPermissionPrefix(user, "training.participation.submit.") && pending && row.createdBy === user?.username;
            return <RegistrationNoteCell editable={!locked && (approver || sender)} row={row} />;
          },
        }
      : undefined;
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Quy trình huấn luyện",
        moduleDescription: "Theo dõi đăng ký, duyệt, tham dự và chấm điểm theo trạng thái workflow.",
        toolbarActions,
        exportEndpoint,
        cellEditors: { ...noteEditor, ...cellEditors },
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
