"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function TrainingWorkflowResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Quy trình huấn luyện"
      moduleDescription="Theo dõi đăng ký, duyệt, tham dự và chấm điểm theo trạng thái workflow."
      tone="violet"
    />
  );
}
