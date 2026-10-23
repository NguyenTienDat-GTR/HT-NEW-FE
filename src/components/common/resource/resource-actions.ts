import type { RouteConfig } from "@/config/routes/routes";

export function getResourceId(route: RouteConfig, row: Record<string, unknown>) {
  const value = row[route.idField ?? "id"] ?? row.id ?? row.code ?? row.username ?? row.roleCode ?? row.permissionCode ?? row.certificateCode;
  return value == null ? undefined : String(value);
}

export function fillRoute(template: string | undefined, params: Record<string, string>) {
  if (!template) return undefined;
  return Object.entries(params).reduce((path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)), template);
}

// Hồ sơ tham dự chỉ được duyệt/từ chối khi đang chờ duyệt.
export function isAwaitingApproval(row: Record<string, unknown>) {
  return ["PENDING", "SUBMITTED"].includes(String(row.approvalStatus ?? ""));
}

// Hồ sơ bị từ chối duyệt (kể cả bị xóa khỏi danh sách tham dự) vẫn được duyệt lại.
export function isReapprovable(row: Record<string, unknown>) {
  return row.approvalStatus === "REJECTED";
}
