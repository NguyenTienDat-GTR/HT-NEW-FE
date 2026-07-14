import { describe, expect, it } from "vitest";
import { canSeeAnalyticsDetail, hasPermissionPrefix, isSuperAdmin } from "@/lib/auth/permissions";

describe("permission matcher", () => {
  it("matches permission prefixes and keeps SUPER_ADMIN out of detailed analytics", () => {
    const user = {
      username: "super-admin",
      roles: ["SUPER_ADMIN"],
      permissions: ["analytics.dashboard.read.all"],
    };

    expect(hasPermissionPrefix(user, "analytics.dashboard.read.")).toBe(true);
    expect(isSuperAdmin(user)).toBe(true);
    expect(canSeeAnalyticsDetail(user)).toBe(false);
  });
});
