import { describe, expect, it } from "vitest";
import { canReadRoute, hasRole, isHiddenForSuperAdmin } from "@/lib/auth/permissions";

const superAdmin = { username: "root", roles: ["SUPER_ADMIN"], permissions: ["training.course.read.all", "system.role.read.all"] };
const dioceseAdmin = { username: "gp", roles: ["ROLE_ADMIN_DIOCESE"], permissions: ["training.course.read.diocese"] };

describe("hasRole", () => {
  it("accepts the bare code and the ROLE_ prefixed form", () => {
    expect(hasRole(dioceseAdmin, "ADMIN_DIOCESE")).toBe(true);
    expect(hasRole(superAdmin, "SUPER_ADMIN")).toBe(true);
    expect(hasRole(dioceseAdmin, "SUPER_ADMIN")).toBe(false);
    expect(hasRole(null, "SUPER_ADMIN")).toBe(false);
  });
});

describe("route access rules", () => {
  const trainingRoute = { moduleName: "training.courses", permissionPrefixes: ["training.course.read."] };
  const systemRoute = { moduleName: "system.roles", permissionPrefixes: ["system.role.read."] };
  const openRoute = { moduleName: "system.profile", permissionPrefixes: [] as string[] };

  it("hides business modules from SUPER_ADMIN only", () => {
    expect(isHiddenForSuperAdmin(trainingRoute, superAdmin)).toBe(true);
    expect(isHiddenForSuperAdmin(systemRoute, superAdmin)).toBe(false);
    expect(isHiddenForSuperAdmin(trainingRoute, dioceseAdmin)).toBe(false);
  });

  it("requires a matching permission unless the route asks for none", () => {
    expect(canReadRoute(trainingRoute, dioceseAdmin)).toBe(true);
    expect(canReadRoute(systemRoute, dioceseAdmin)).toBe(false);
    expect(canReadRoute(openRoute, dioceseAdmin)).toBe(true);
    expect(canReadRoute(trainingRoute, superAdmin)).toBe(false);
  });
});
