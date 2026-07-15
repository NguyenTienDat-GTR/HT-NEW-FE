"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function TrainingResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Huấn luyện"
      moduleDescription="Thiết lập điều kiện, khóa, thành phần điểm và công thức theo owner scope."
      tone="emerald"
    />
  );
}
