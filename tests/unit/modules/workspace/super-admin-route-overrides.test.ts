import { ShieldCheck } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/auth-store";
import type { RouteConfig } from "@/config/routes/routes";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";

const rolePermissionRoute: RouteConfig = {
  path: "/system/role-permissions",
  moduleName: "system.role-permission",
  title: "Phan quyen vai tro",
  subtitle: "Role permission assignment",
  endpoint: "/system/role-permissions",
  idField: "id",
  kind: "role-permissions",
  icon: ShieldCheck,
  columns: ["roleCode", "permissionCode", "effect"],
  permissionPrefixes: ["system.role_permission.read.", "system.role_permission.assign.", "system.role_permission.revoke."],
  filters: [
    { key: "role.roleCode", label: "Vai tro", type: "select", optionsEndpoint: "/system/roles", optionValue: "roleCode", optionLabel: "roleName" },
    { key: "effect", label: "Hieu luc", type: "select", options: ["ALLOW", "DENY"].map((value) => ({ value, label: value })) },
  ],
};

function adminUser(permissions: string[]): AuthUser {
  return {
    username: "admin",
    roles: ["ADMIN_DIOCESE"],
    permissions,
  };
}

describe("resolveRouteForUser", () => {
  it("keeps role dropdown when scoped admin can read role options", () => {
    const route = resolveRouteForUser(rolePermissionRoute, adminUser(["system.role.read.diocese", "system.role_permission.read.diocese"]));

    expect(route.filters?.[0]).toMatchObject({
      key: "role.roleCode",
      type: "select",
      optionsEndpoint: "/system/roles",
    });
    expect(route.filters?.[1]).toMatchObject({ key: "effect", type: "select" });
  });

  it("falls back to text role filter when scoped admin cannot call role options endpoint", () => {
    const route = resolveRouteForUser(rolePermissionRoute, adminUser(["system.role_permission.assign.diocese"]));

    expect(route.filters?.[0]).toMatchObject({
      key: "role.roleCode",
      type: "text",
    });
    expect(route.filters?.[0]).not.toHaveProperty("optionsEndpoint");
    expect(route.filters?.[1]).toMatchObject({ key: "effect", type: "select" });
  });
});
