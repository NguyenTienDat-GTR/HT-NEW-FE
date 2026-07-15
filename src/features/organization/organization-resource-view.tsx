"use client";

import type { RouteConfig } from "@/features/workspace/routes";
import { ResourceListPage } from "@/features/resources/resource-list-page";

export function OrganizationResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListPage
      route={route}
      moduleLabel="Tổ chức"
      moduleDescription="Quản lý giáo phận, giáo hạt và giáo xứ theo scope hiện hành."
      tone="blue"
    />
  );
}
