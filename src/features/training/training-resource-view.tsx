"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function TrainingResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Huấn luyện"
      moduleDescription="Thiết lập điều kiện, khóa, thành phần điểm và công thức theo owner scope."
      tone="emerald"
      buildSummary={trainingSummary}
      sidePanel={
        <ModuleSidePanel
          title="Thiết lập khóa"
          description="Các cấu hình huấn luyện phải khớp owner scope và trạng thái khóa của dữ liệu điểm."
          items={[
            { label: "DT course", value: "Deanery quản lý" },
            { label: "Course khác", value: "Diocese quản lý" },
            { label: "Formula", value: "Bắt buộc scoreFormulaId" },
            { label: "Locked", value: "Không sửa khi đã có totalScore" },
          ]}
          tone="emerald"
        />
      }
    />
  );
}

function trainingSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const active = rows.filter((row) => row.status === true).length;
  const locked = rows.filter((row) => row.locked === true).length;
  return [
    { label: "Tổng cấu hình", value: viNumber.format(data?.totalElements ?? 0), caption: "Trong scope hiện tại", tone: "emerald" as const },
    { label: "Đang hoạt động", value: viNumber.format(active), caption: "Trong trang hiện tại", tone: "emerald" as const },
    { label: "Đã khóa", value: viNumber.format(locked), caption: "Formula có dữ liệu điểm", tone: "amber" as const },
    { label: "Trang", value: viNumber.format((data?.number ?? 0) + 1), caption: `${viNumber.format(data?.totalPages ?? 1)} trang` },
  ];
}
