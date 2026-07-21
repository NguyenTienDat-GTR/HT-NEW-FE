"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";

export function TrainingResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Huấn luyện",
        moduleDescription: "Thiết lập điều kiện, khóa, thành phần điểm và công thức theo owner scope.",
      }}
    />
  );
}
