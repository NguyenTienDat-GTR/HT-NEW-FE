import type { AuthUser } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import type { RouteFilterConfig } from "@/config/routes/route-config";

export function resolveRouteForUser(route: RouteConfig, user: AuthUser | null): RouteConfig {
  if (!isSuperAdmin(user)) {
    if (route.kind === "role-permissions") {
      return {
        ...route,
        filters: rolePermissionFiltersForUser(user),
      };
    }
    if (route.kind !== "accounts") return route;
    return {
      ...route,
      filterLabels: ["Vai trò", "Scope", "Trạng thái"],
      filters: accountFiltersForUser(user),
    };
  }

  switch (route.kind) {
    case "accounts":
      return {
        ...route,
        title: "Tài khoản",
        subtitle: "SUPER_ADMIN chỉ quản lý tài khoản SUPER_ADMIN và ADMIN_DIOCESE.",
        columns: ["username", "primaryRoleName", "dioceseName", "status"],
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
            key: "roleCode",
            label: "Vai trò",
            type: "select",
            options: [
              { value: "SUPER_ADMIN", label: "Super admin" },
              { value: "ADMIN_DIOCESE", label: "Admin giáo phận" },
            ],
          },
          { key: "dioceseId", label: "Giáo phận", type: "select", optionsEndpoint: "/dioceses", optionValue: "id", optionLabel: "name" },
        ],
      };
    case "roles":
      return {
        ...route,
        subtitle: "Vai trò hệ thống và vai trò custom do super-admin tạo.",
        columns: ["roleCode", "roleName", "displayOrder", "isSystem", "status"],
      };
    case "role-permissions":
      return {
        ...route,
        subtitle: "Gán ALLOW/DENY cho một vai trò bằng danh sách checkbox.",
        columns: ["roleCode", "permissionCode", "effect", "assignedAt", "expiresAt"],
        primaryActionLabel: "Gán nhiều quyền",
        filters: rolePermissionFiltersForUser(user),
      };
    case "account-permissions":
      return {
        ...route,
        subtitle: "Gán ALLOW/DENY trực tiếp cho tài khoản hợp lệ bằng checkbox.",
        columns: ["username", "permissionCode", "effect", "reason", "expiresAt"],
        primaryActionLabel: "Thêm nhiều quyền riêng",
        filters: accountPermissionFilters(),
      };
    default:
      return route;
  }
}

function accountFiltersForUser(user: AuthUser | null): RouteFilterConfig[] {
  const filters: RouteFilterConfig[] = [roleFilter()];
  if (hasPermissionPrefix(user, "system.account.manage.all") || hasPermissionPrefix(user, "system.account.manage.diocese")) {
    filters.push(dioceseFilter(), deaneryFilter(), parishFilter());
  } else if (hasPermissionPrefix(user, "system.account.manage.deanery")) {
    filters.push(deaneryFilter(), parishFilter());
  } else if (hasPermissionPrefix(user, "system.account.manage.parish")) {
    filters.push(parishFilter());
  }
  filters.push(statusFilter());
  return filters;
}

function rolePermissionFiltersForUser(user: AuthUser | null): RouteFilterConfig[] {
  const canReadRoleOptions =
    hasPermissionPrefix(user, "system.role.read.") ||
    hasPermissionPrefix(user, "system.role.create.") ||
    hasPermissionPrefix(user, "system.role.update.") ||
    hasPermissionPrefix(user, "system.role.toggle.");

  return [
    canReadRoleOptions
      ? {
          key: "role.roleCode",
          label: "Vai trò",
          type: "select",
          optionsEndpoint: "/system/roles",
          optionValue: "roleCode",
          optionLabel: "roleName",
        }
      : {
          key: "role.roleCode",
          label: "Vai trò",
          type: "text",
          placeholder: "Lọc theo mã vai trò",
        },
    ...permissionTaxonomyFilters(),
    effectFilter(),
  ];
}

function accountPermissionFilters(): RouteFilterConfig[] {
  return [
    {
      key: "account.username",
      label: "Tài khoản",
      type: "select",
      optionsEndpoint: "/system/accounts/permission-targets",
      optionValue: "username",
      optionLabel: "username",
    },
    ...permissionTaxonomyFilters(),
    effectFilter(),
  ];
}

function permissionTaxonomyFilters(): RouteFilterConfig[] {
  return [
    {
      key: "permission.module.moduleCode",
      label: "Phân hệ",
      type: "select",
      optionsEndpoint: "/system/permissions/taxonomy",
      optionCollection: "modules",
      optionValue: "code",
      optionLabel: "name",
    },
    {
      key: "permission.resource.resourceCode",
      label: "Đối tượng",
      type: "select",
      optionsEndpoint: "/system/permissions/taxonomy",
      optionCollection: "resources",
      optionValue: "code",
      optionLabel: "name",
    },
    {
      key: "permission.action.actionCode",
      label: "Thao tác",
      type: "select",
      optionsEndpoint: "/system/permissions/taxonomy",
      optionCollection: "actions",
      optionValue: "code",
      optionLabel: "name",
    },
    {
      key: "permission.scope.scopeCode",
      label: "Phạm vi",
      type: "select",
      optionsEndpoint: "/system/permissions/taxonomy",
      optionCollection: "scopes",
      optionValue: "code",
      optionLabel: "name",
    },
  ];
}

function effectFilter(): RouteFilterConfig {
  return {
    key: "effect",
    label: "Hiệu lực",
    type: "select",
    options: [
      { value: "ALLOW", label: "Cho phép" },
      { value: "DENY", label: "Từ chối" },
    ],
  };
}

function roleFilter(): RouteFilterConfig {
  return {
    key: "roleCode",
    label: "Vai trò",
    type: "select",
    optionsEndpoint: "/system/roles",
    optionValue: "roleCode",
    optionLabel: "roleName",
  };
}

function dioceseFilter(): RouteFilterConfig {
  return { key: "dioceseId", label: "Giáo phận", type: "select", optionsEndpoint: "/dioceses", optionValue: "id", optionLabel: "name" };
}

function deaneryFilter(): RouteFilterConfig {
  return { key: "deaneryId", label: "Giáo hạt", type: "select", optionsEndpoint: "/deaneries", optionValue: "id", optionLabel: "name" };
}

function parishFilter(): RouteFilterConfig {
  return { key: "parishId", label: "Giáo xứ", type: "select", optionsEndpoint: "/parishes", optionValue: "id", optionLabel: "name" };
}

function statusFilter(): RouteFilterConfig {
  return {
    key: "status",
    label: "Trạng thái",
    type: "select",
    options: [
      { value: "all", label: "Tất cả" },
      { value: "active", label: "Đang hoạt động" },
      { value: "inactive", label: "Tạm ngưng" },
    ],
  };
}
