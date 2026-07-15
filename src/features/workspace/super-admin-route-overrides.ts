import type { AuthUser } from "@/lib/auth/auth-store";
import { isSuperAdmin } from "@/lib/auth/permissions";
import type { RouteConfig } from "./routes";

export function resolveRouteForUser(route: RouteConfig, user: AuthUser | null): RouteConfig {
  if (!isSuperAdmin(user)) return route;

  switch (route.kind) {
    case "accounts":
      return {
        ...route,
        title: "Tài khoản",
        subtitle: "SUPER_ADMIN chỉ quản lý tài khoản SUPER_ADMIN và ADMIN_DIOCESE.",
        columns: ["username", "leaderFullName", "primaryRoleCode", "dioceseName", "status"],
        filterLabels: ["Vai trò", "Giáo phận", "Trạng thái"],
        filters: [
          {
            key: "status",
            label: "Trạng thái",
            type: "select",
            options: [
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Tạm ngưng" },
            ],
          },
          {
            key: "primaryRoleCode",
            label: "Vai trò",
            type: "select",
            options: [
              { value: "SUPER_ADMIN", label: "Super admin" },
              { value: "ADMIN_DIOCESE", label: "Admin giáo phận" },
            ],
          },
          { key: "diocese.id", label: "Giáo phận", type: "select", optionsEndpoint: "/dioceses", optionValue: "id", optionLabel: "name" },
        ],
      };
    case "roles":
      return {
        ...route,
        subtitle: "Vai trò hệ thống và vai trò custom do super-admin tạo.",
        columns: ["roleCode", "roleName", "description", "displayOrder", "isSystem", "status"],
      };
    case "role-permissions":
      return {
        ...route,
        subtitle: "Gán ALLOW/DENY cho một vai trò bằng danh sách checkbox.",
        columns: ["roleCode", "permissionCode", "effect", "assignedAt", "expiresAt"],
        primaryActionLabel: "Gán nhiều quyền",
        filters: [
          { key: "role.roleCode", label: "Vai trò", type: "select", optionsEndpoint: "/system/roles", optionValue: "roleCode", optionLabel: "roleName" },
          {
            key: "effect",
            label: "Hiệu lực",
            type: "select",
            options: ["ALLOW", "DENY"].map((value) => ({ value, label: value })),
          },
        ],
      };
    case "account-permissions":
      return {
        ...route,
        subtitle: "Gán ALLOW/DENY trực tiếp cho tài khoản hợp lệ bằng checkbox.",
        columns: ["username", "permissionCode", "effect", "reason", "expiresAt"],
        primaryActionLabel: "Thêm nhiều quyền riêng",
        filters: [
          { key: "account.username", label: "Tài khoản", type: "select", optionsEndpoint: "/system/accounts/permission-targets", optionValue: "username", optionLabel: "username" },
          {
            key: "effect",
            label: "Hiệu lực",
            type: "select",
            options: ["ALLOW", "DENY"].map((value) => ({ value, label: value })),
          },
        ],
      };
    default:
      return route;
  }
}
