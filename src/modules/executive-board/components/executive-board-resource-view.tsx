"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";

export function ExecutiveBoardResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Ban điều hành",
        moduleDescription: "Quản lý chức vụ và phân công theo cấp đơn vị, ngày hiệu lực và scope phân quyền.",
      }}
    />
  );
}
