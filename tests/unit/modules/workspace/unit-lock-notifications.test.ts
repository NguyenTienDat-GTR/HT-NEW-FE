import { ShieldCheck } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/auth-store";
import type { RouteConfig } from "@/config/routes/routes";
import { canSeeRoute, notificationBadgeLabel } from "@/modules/workspace/components/app-shell";

const businessRoute: RouteConfig = {
  path: "/system/accounts",
  moduleName: "system.account",
  title: "Accounts",
  subtitle: "Account management",
  endpoint: "/system/accounts",
  kind: "accounts",
  icon: ShieldCheck,
  columns: ["username"],
  permissionPrefixes: ["system.account.manage."],
};

const notificationRoute: RouteConfig = {
  ...businessRoute,
  path: "/notifications",
  moduleName: "system.notification",
  title: "Notifications",
  endpoint: "/system/notifications",
  kind: "notifications",
  permissionPrefixes: [],
};

function lockedUser(): AuthUser {
  return {
    username: "locked",
    roles: [],
    permissions: [],
    unitLocked: true,
  };
}

describe("unit-locked workspace access", () => {
  it("only exposes the notification inbox", () => {
    expect(canSeeRoute(notificationRoute, lockedUser())).toBe(true);
    expect(canSeeRoute(businessRoute, lockedUser())).toBe(false);
  });
});

describe("notificationBadgeLabel", () => {
  it("hides zero and caps large counts", () => {
    expect(notificationBadgeLabel(0)).toBeNull();
    expect(notificationBadgeLabel(5)).toBe("5");
    expect(notificationBadgeLabel(100)).toBe("99+");
  });
});
