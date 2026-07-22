import { describe, expect, it } from "vitest";
import { systemRouteGroup } from "@/config/routes/groups/system";

describe("system route filters", () => {
  it("includes effect filter on permission catalog list", () => {
    const permissionRoute = systemRouteGroup.children.find((route) => route.path === "/system/permissions");

    expect(permissionRoute?.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "effect",
          label: "Hiệu lực",
          type: "select",
          options: [
            { value: "ALLOW", label: "Cho phép" },
            { value: "DENY", label: "Từ chối" },
          ],
        }),
      ]),
    );
  });

  it("requires super-admin role and toggle permission for permission catalog toggle action", () => {
    const permissionRoute = systemRouteGroup.children.find((route) => route.path === "/system/permissions");

    expect(permissionRoute?.actions?.toggle).toMatchObject({
      requiredRoles: ["SUPER_ADMIN", "ROLE_SUPER_ADMIN"],
      permissionPrefixes: ["system.permission.toggle."],
    });
  });

  it("uses entity search fields for permission catalog search", () => {
    const permissionRoute = systemRouteGroup.children.find((route) => route.path === "/system/permissions");

    expect(permissionRoute?.searchFields).toEqual(
      expect.arrayContaining(["permissionCode", "permissionName", "module.moduleCode", "resource.resourceCode", "action.actionCode", "scope.scopeCode"]),
    );
  });

  it("shows account-role toggle switch for assign permission holders", () => {
    const accountRoleRoute = systemRouteGroup.children.find((route) => route.path === "/system/account-roles");

    expect(accountRoleRoute?.actions?.toggle?.permissionPrefixes).toEqual(
      expect.arrayContaining(["system.account_role.assign.", "system.account_role.toggle."]),
    );
  });
});
