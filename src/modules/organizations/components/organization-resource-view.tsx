"use client";

import { ResourceListRuntime } from "@/components/common/resource/resource-list-runtime";
import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";
import { isSuperAdmin } from "@/lib/auth/permissions";

export function OrganizationResourceView({ route }: { route: RouteConfig }) {
  return (
    <ResourceListRuntime
      route={route}
      config={{
        moduleLabel: "Tổ chức",
        moduleDescription: "Quản lý giáo phận, giáo hạt và giáo xứ theo scope hiện hành.",
        canCreate,
      }}
    />
  );
}

function canCreate(route: RouteConfig, user: AuthUser | null) {
  if (!isSuperAdmin(user)) return true;
  return route.kind !== "deaneries" && route.kind !== "parishes";
}
