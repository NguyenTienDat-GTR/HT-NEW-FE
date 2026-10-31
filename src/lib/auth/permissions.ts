import type { AuthUser } from "./auth-store";
import type { ResourceActionConfig } from "@/config/routes/route-config";

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null | undefined, permissions: string[]) {
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasPermissionPrefix(user: AuthUser | null | undefined, prefix: string) {
  if (!user) return false;
  return user.permissions.some((permission) => permission.startsWith(prefix));
}

export function isSuperAdmin(user: AuthUser | null | undefined) {
  return Boolean(user?.roles.some((role) => role === "SUPER_ADMIN" || role === "ROLE_SUPER_ADMIN"));
}

/** Có vai trò này (chấp nhận cả dạng có tiền tố ROLE_). */
export function hasRole(user: AuthUser | null | undefined, roleCode: string) {
  return Boolean(user?.roles.some((role) => role === roleCode || role === `ROLE_${roleCode}`));
}

export function hasAnyRole(user: AuthUser | null | undefined, roles: string[] | undefined) {
  if (!roles?.length) return true;
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

export function canUseAction(user: AuthUser | null | undefined, action: ResourceActionConfig | undefined) {
  if (!action) return false;
  if (!hasAnyRole(user, action.requiredRoles)) return false;
  const prefixes = action.permissionPrefixes ?? [];
  if (!prefixes.length) return true;
  return prefixes.some((prefix) => hasPermissionPrefix(user, prefix));
}

export function canSeeAnalyticsDetail(user: AuthUser | null | undefined) {
  return !isSuperAdmin(user) && hasPermissionPrefix(user, "analytics.dashboard.read.");
}

/** Các module nghiệp vụ mà SUPER_ADMIN không dùng (chỉ quản trị hệ thống). */
const SUPER_ADMIN_HIDDEN_MODULE_PREFIXES = ["leader.", "executive-board.", "training.", "training-workflow.", "certificate."];

export function isHiddenForSuperAdmin(route: { moduleName: string }, user: AuthUser | null | undefined) {
  if (!isSuperAdmin(user)) return false;
  return SUPER_ADMIN_HIDDEN_MODULE_PREFIXES.some((prefix) => route.moduleName.startsWith(prefix));
}

/** Được xem màn hình: không bị ẩn theo vai trò và có ít nhất một quyền của màn hình (hoặc màn hình không đòi quyền). */
export function canReadRoute(route: { moduleName: string; permissionPrefixes: string[] }, user: AuthUser | null | undefined) {
  if (isHiddenForSuperAdmin(route, user)) return false;
  return route.permissionPrefixes.length === 0 || route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix));
}
