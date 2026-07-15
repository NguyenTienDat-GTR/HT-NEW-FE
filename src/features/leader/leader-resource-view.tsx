"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function LeaderResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Tổ chức / Huynh trưởng"
      moduleDescription="Quản lý hồ sơ huynh trưởng theo giáo xứ, cấp hiện tại và trạng thái sinh hoạt."
      tone="violet"
    />
  );
}
