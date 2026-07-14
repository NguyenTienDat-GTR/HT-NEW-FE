"use client";

import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";
import { ModuleSidePanel, ResourceListPage } from "@/features/resources/resource-list-page";

export function LeaderResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Tổ chức / Huynh trưởng"
      moduleDescription="Quản lý hồ sơ huynh trưởng theo giáo xứ, cấp hiện tại và trạng thái sinh hoạt."
      tone="violet"
      buildSummary={leaderSummary}
      sidePanel={
        <ModuleSidePanel
          title="Quy tắc hồ sơ"
          description="UI chỉ mở các hành động đúng scope, còn backend vẫn là nguồn kiểm tra cuối cùng."
          items={[
            { label: "Avatar", value: "Leader.imageUrl" },
            { label: "Tạo mới", value: "Bắt buộc parishId" },
            { label: "Cập nhật", value: "Không gửi fullName, birthDate, leaderLevel" },
            { label: "Trạng thái", value: "Dùng xác nhận Xác nhận" },
          ]}
          tone="violet"
        />
      }
    />
  );
}

function leaderSummary(data?: PageResponse<Record<string, unknown>>) {
  const rows = data?.content ?? [];
  const active = rows.filter((row) => row.status === true).length;
  const withImage = rows.filter((row) => typeof row.imageUrl === "string" && row.imageUrl).length;
  return [
    { label: "Tổng huynh trưởng", value: viNumber.format(data?.totalElements ?? 0), caption: "Đã ép scope từ backend" },
    { label: "Đang hoạt động", value: viNumber.format(active), caption: "Trong trang hiện tại", tone: "emerald" as const },
    { label: "Có ảnh hồ sơ", value: viNumber.format(withImage), caption: "Nguồn từ Leader.imageUrl" },
    { label: "Trang", value: viNumber.format((data?.number ?? 0) + 1), caption: `${viNumber.format(data?.totalPages ?? 1)} trang` },
  ];
}
