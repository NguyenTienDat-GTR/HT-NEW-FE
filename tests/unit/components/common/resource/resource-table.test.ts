import { ShieldCheck } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";
import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";
import { shouldHideStatusColumn, visibleResourceColumns } from "@/components/common/resource/resource-table";

function user(permissions: string[]): AuthUser {
  return {
    username: "admin",
    roles: ["ADMIN_DIOCESE"],
    permissions,
  };
}

function superAdmin(permissions: string[] = []): AuthUser {
  return {
    username: "super-admin",
    roles: ["SUPER_ADMIN"],
    permissions,
  };
}

const toggleRoute: RouteConfig = {
  path: "/organization/parishes",
  moduleName: "organization.parish",
  title: "Parishes",
  subtitle: "Parish list",
  endpoint: "/parishes",
  idField: "id",
  kind: "parishes",
  icon: ShieldCheck,
  columns: ["name", "status"],
  permissionPrefixes: ["organization.parish.read."],
  actions: {
    toggle: { label: "Toggle", permissionPrefixes: ["organization.parish.toggle."] },
  },
};

const permissionRoute: RouteConfig = {
  ...toggleRoute,
  path: "/system/permissions",
  moduleName: "system.permission",
  endpoint: "/system/permissions",
  idField: "permissionCode",
  kind: "permissions",
  columns: ["permissionCode", "status"],
  actions: {
    toggle: {
      label: "Toggle",
      permissionPrefixes: ["system.permission.toggle."],
      requiredRoles: ["SUPER_ADMIN", "ROLE_SUPER_ADMIN"],
    },
  },
};

describe("shouldHideStatusColumn", () => {
  it("hides status when at least one row can render a toggle switch", () => {
    expect(shouldHideStatusColumn(toggleRoute, [{ id: "p1", name: "Parish", status: true }], user(["organization.parish.toggle.deanery"]))).toBe(true);
  });

  it("keeps status when the current user cannot render a toggle switch", () => {
    expect(shouldHideStatusColumn(toggleRoute, [{ id: "p1", name: "Parish", status: true }], user(["organization.parish.read.deanery"]))).toBe(false);
  });

  it("keeps status when the route has no status column", () => {
    expect(
      shouldHideStatusColumn(
        {
          ...toggleRoute,
          columns: ["name"],
        },
        [{ id: "p1", name: "Parish", status: true }],
        user(["organization.parish.toggle.deanery"]),
      ),
    ).toBe(false);
  });

  it("removes only the exact status column and preserves similar business-state columns", () => {
    const columns = visibleResourceColumns(
      {
        ...toggleRoute,
        columns: ["name", "effect", "approvalStatus", "participationStatus", "status"],
      },
      [{ id: "p1", name: "Parish", effect: "ALLOW", approvalStatus: "PENDING", participationStatus: "REGISTERED", status: true }],
      user(["organization.parish.toggle.deanery"]),
    );

    expect(columns).toEqual(["name", "effect", "approvalStatus", "participationStatus"]);
  });

  it("keeps permission status visible for non-super-admin even when permission toggle prefix exists", () => {
    const columns = visibleResourceColumns(
      permissionRoute,
      [{ permissionCode: "system.permission.read.all", status: true }],
      user(["system.permission.toggle.all"]),
    );

    expect(columns).toEqual(["permissionCode", "status"]);
  });

  it("keeps permission status visible for super-admin without permission catalog toggle permission", () => {
    const columns = visibleResourceColumns(
      permissionRoute,
      [{ permissionCode: "system.permission.read.all", status: true }],
      superAdmin(),
    );

    expect(columns).toEqual(["permissionCode", "status"]);
  });

  it("hides permission status for super-admin with permission catalog toggle permission", () => {
    const columns = visibleResourceColumns(
      permissionRoute,
      [{ permissionCode: "system.permission.read.all", status: true }],
      superAdmin(["system.permission.toggle.all"]),
    );

    expect(columns).toEqual(["permissionCode"]);
  });
});
