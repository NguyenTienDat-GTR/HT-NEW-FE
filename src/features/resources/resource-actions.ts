import type { RouteConfig } from "@/features/workspace/routes";

export function getResourceId(route: RouteConfig, row: Record<string, unknown>) {
  const value = row[route.idField ?? "id"] ?? row.id ?? row.code ?? row.username ?? row.roleCode ?? row.permissionCode ?? row.certificateCode;
  return value == null ? undefined : String(value);
}

export function fillRoute(template: string | undefined, params: Record<string, string>) {
  if (!template) return undefined;
  return Object.entries(params).reduce((path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)), template);
}
