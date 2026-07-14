"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function CertificateResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Chứng nhận"
      moduleDescription="Quản lý chứng nhận, duyệt ngoại lệ và promotion sau khi hồ sơ đã chấm điểm."
      tone="rose"
      buildSummary={certificateSummary}
      sidePanel={
        <ModuleSidePanel
          title="Duyệt chứng nhận"
          description="Certificate được duyệt sẽ khóa điểm và có thể cập nhật cấp huynh trưởng theo rule promotion."
          items={[
            { label: "Pending", value: "Có thể systemSuggested" },
            { label: "Không đạt", value: "Bắt buộc approvalReason" },
            { label: "Approve", value: "Khóa identity/result" },
            { label: "Promotion", value: "Chỉ tăng, không hạ cấp" },
          ]}
          tone="rose"
        />
      }
    />
  );
}

function certificateSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const pending = rows.filter((row) => row.approvalStatus === "PENDING").length;
  const approved = rows.filter((row) => row.approvalStatus === "APPROVED").length;
  const exceptionRequired = rows.filter((row) => row.approvalReasonRequired === true).length;
  return [
    { label: "Tổng chứng nhận", value: viNumber.format(data?.totalElements ?? 0), caption: "Theo scope course/leader", tone: "rose" as const },
    { label: "Chờ duyệt", value: viNumber.format(pending), caption: "Trong trang hiện tại", tone: "amber" as const },
    { label: "Đã duyệt", value: viNumber.format(approved), caption: "Khóa sửa điểm", tone: "emerald" as const },
    { label: "Cần lý do", value: viNumber.format(exceptionRequired), caption: "Chưa đạt passing score", tone: "rose" as const },
  ];
}
