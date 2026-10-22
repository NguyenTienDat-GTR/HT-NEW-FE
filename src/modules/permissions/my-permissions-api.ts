"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch, type BaseSearchParams } from "@/lib/api/search";

export type MyPermission = {
  permissionCode: string;
  permissionName?: string | null;
  description?: string | null;
  moduleName?: string | null;
  resourceName?: string | null;
  actionName?: string | null;
  scopeName?: string | null;
  sourceType: "ROLE" | "ACCOUNT";
  roleCode?: string | null;
  roleName?: string | null;
  note?: string | null;
  assignedByName?: string | null;
  assignedAt?: string | null;
  expiresAt?: string | null;
};

export type MyPermissionFilterOptions = { modules: string[]; actions: string[] };

export const myPermissionKeys = {
  list: (params: BaseSearchParams) => ["auth", "me", "permissions", params] as const,
  options: ["auth", "me", "permissions", "filter-options"] as const,
};

export function useMyPermissions(params: BaseSearchParams) {
  const queryString = serializeBaseSearch(params).toString();
  return useQuery({
    queryKey: myPermissionKeys.list(params),
    queryFn: () => apiFetch<PageResponse<MyPermission>>(`/auth/me/permissions?${queryString}`),
    placeholderData: (previous) => previous,
  });
}

export function useMyPermissionFilterOptions() {
  return useQuery({
    queryKey: myPermissionKeys.options,
    queryFn: () => apiFetch<MyPermissionFilterOptions>("/auth/me/permissions/filter-options"),
  });
}
