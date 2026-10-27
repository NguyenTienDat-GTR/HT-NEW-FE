import type { AuthUser } from "@/lib/auth/auth-store";
import { hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";
import type { RouteConfig } from "@/config/routes/routes";
import { deaneryUnitFilter, parishUnitFilter, type RouteFilterConfig } from "@/config/routes/route-config";

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
        subtitle: "SUPER_ADMIN quản lý tài khoản SUPER_ADMIN, ADMIN_DIOCESE và các vai trò toàn hệ thống do super-admin tạo.",
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
          roleFilter(),
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
        subtitle: "Phân quyền hoặc thu hồi quyền cho vai trò do super-admin quản lý.",
        columns: ["roleName", "permissionName", "validity", "assignedAt", "expiresAt"],
        primaryActionLabel: "Phân quyền",
        filters: rolePermissionFiltersForUser(user),
      };
    case "account-permissions":
      return {
        ...route,
        subtitle: "Phân quyền hoặc thu hồi quyền trực tiếp cho tài khoản do super-admin tạo.",
        columns: ["username", "permissionName", "validity", "reason", "expiresAt"],
        primaryActionLabel: "Phân quyền",
        filters: accountPermissionFilters(),
      };
    default:
      return route;
  }
}

function accountFiltersForUser(user: AuthUser | null): RouteFilterConfig[] {
  const filters: RouteFilterConfig[] = [roleFilter()];
  if (hasPermissionPrefix(user, "system.account.manage.all") || hasPermissionPrefix(user, "system.account.manage.diocese")) {
    filters.push(dioceseFilter(), deaneryFilter("dioceseId"), parishFilter("deaneryId"));
  } else if (hasPermissionPrefix(user, "system.account.manage.deanery")) {
    filters.push(deaneryFilter(), parishFilter("deaneryId"));
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

function deaneryFilter(parentKey?: string): RouteFilterConfig {
  return deaneryUnitFilter("deaneryId", parentKey);
}

function parishFilter(parentKey?: string): RouteFilterConfig {
  return parishUnitFilter("parishId", parentKey);
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
