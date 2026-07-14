"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function TrainingWorkflowResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Quy trình huấn luyện"
      moduleDescription="Theo dõi đăng ký, duyệt, tham dự và chấm điểm theo trạng thái workflow."
      tone="violet"
      buildSummary={workflowSummary}
      sidePanel={
        <ModuleSidePanel
          title="Luồng xử lý"
          description="Màn hình workflow luôn khóa action theo trạng thái hiện tại để tránh submit sai bước."
          items={[
            { label: "Đăng ký", value: "Batch atomic" },
            { label: "Duyệt", value: "DT deanery, non-DT diocese" },
            { label: "Chấm điểm", value: "Đúng đủ component formula" },
            { label: "Khóa điểm", value: "Khi certificate APPROVED" },
          ]}
          tone="violet"
        />
      }
    />
  );
}

function workflowSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const pending = rows.filter((row) => Object.values(row).some((value) => value === "PENDING" || value === "SUBMITTED")).length;
  const approved = rows.filter((row) => Object.values(row).some((value) => value === "APPROVED")).length;
  const passed = rows.filter((row) => row.passed === true).length;
  return [
    { label: "Hồ sơ", value: viNumber.format(data?.totalElements ?? 0), caption: "Theo queue hiện tại" },
    { label: "Chờ xử lý", value: viNumber.format(pending), caption: "Trong trang hiện tại", tone: "amber" as const },
    { label: "Đã duyệt", value: viNumber.format(approved), caption: "Có trạng thái APPROVED", tone: "emerald" as const },
    { label: "Đạt", value: viNumber.format(passed), caption: "passed = true", tone: "emerald" as const },
  ];
}
