import type { AuthUser } from "./auth-store";

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

export function canSeeAnalyticsDetail(user: AuthUser | null | undefined) {
  return !isSuperAdmin(user) && hasPermissionPrefix(user, "analytics.dashboard.read.");
}
