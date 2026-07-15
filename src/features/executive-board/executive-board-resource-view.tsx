"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function ExecutiveBoardResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Ban điều hành"
      moduleDescription="Quản lý chức vụ và phân công theo cấp đơn vị, ngày hiệu lực và scope phân quyền."
      tone="amber"
    />
  );
}
