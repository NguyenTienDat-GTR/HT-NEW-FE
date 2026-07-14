"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function OrganizationResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Tổ chức"
      moduleDescription="Quản lý giáo phận, giáo hạt và giáo xứ theo mô hình UUID và scope hiện hành."
      tone="blue"
      buildSummary={organizationSummary}
      sidePanel={
        <ModuleSidePanel
          title="Chuỗi đơn vị"
          description="Các màn hình tổ chức dùng UUID public id, không phụ thuộc mã business cũ."
          items={[
            { label: "Diocese", value: "id UUID" },
            { label: "Deanery", value: "dioceseId khi tạo" },
            { label: "Parish", value: "deaneryId khi tạo" },
            { label: "Filter", value: "Dùng entity-path" },
          ]}
          tone="blue"
        />
      }
    />
  );
}

function organizationSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const active = rows.filter((row) => row.status === true).length;
  return [
    { label: "Tổng đơn vị", value: viNumber.format(data?.totalElements ?? 0), caption: "Theo quyền đọc hiện tại", tone: "blue" as const },
    { label: "Đang hoạt động", value: viNumber.format(active), caption: "Trong trang hiện tại", tone: "emerald" as const },
    { label: "Kích thước trang", value: viNumber.format(data?.size ?? 10), caption: "Tối đa backend 100 dòng" },
    { label: "Trang", value: viNumber.format((data?.number ?? 0) + 1), caption: `${viNumber.format(data?.totalPages ?? 1)} trang` },
  ];
}
