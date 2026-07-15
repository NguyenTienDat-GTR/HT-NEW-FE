"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function CertificateResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Chứng nhận"
      moduleDescription="Quản lý chứng nhận, duyệt ngoại lệ và promotion sau khi hồ sơ đã chấm điểm."
      tone="rose"
    />
  );
}
