"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";

export function LeaderResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Tổ chức / Huynh trưởng",
        moduleDescription: "Quản lý hồ sơ huynh trưởng theo giáo xứ, cấp hiện tại và trạng thái sinh hoạt.",
      }}
    />
  );
}
