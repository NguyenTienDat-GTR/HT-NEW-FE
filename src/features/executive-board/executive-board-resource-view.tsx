"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function ExecutiveBoardResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Ban điều hành"
      moduleDescription="Quản lý chức vụ và phân công theo cấp đơn vị, ngày hiệu lực và scope phân quyền."
      tone="amber"
      buildSummary={executiveBoardSummary}
      sidePanel={
        <ModuleSidePanel
          title="Phân công hợp lệ"
          description="UI cảnh báo sớm các trường hợp dễ 409, nhưng backend vẫn kiểm tra uniqueness và hierarchy."
          items={[
            { label: "unitType", value: "DIOCESE, DEANERY, PARISH" },
            { label: "Ngày", value: "endDate không trước startDate" },
            { label: "Active", value: "Một leader/current position mỗi unit" },
            { label: "Xóa", value: "Ưu tiên toggle-status" },
          ]}
          tone="amber"
        />
      }
    />
  );
}

function executiveBoardSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const active = rows.filter((row) => row.status === true).length;
  return [
    { label: "Tổng bản ghi", value: viNumber.format(data?.totalElements ?? 0), caption: "Chức vụ hoặc phân công", tone: "amber" as const },
    { label: "Đang hiệu lực", value: viNumber.format(active), caption: "Trong trang hiện tại", tone: "emerald" as const },
    { label: "Cần rà soát", value: viNumber.format(Math.max(rows.length - active, 0)), caption: "Tạm ngưng hoặc hết hạn", tone: "rose" as const },
    { label: "Trang", value: viNumber.format((data?.number ?? 0) + 1), caption: `${viNumber.format(data?.totalPages ?? 1)} trang` },
  ];
}
