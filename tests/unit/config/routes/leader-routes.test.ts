import { describe, expect, it } from "vitest";
import { findRoute, matchRoute } from "@/config/routes/routes";
import { canUseAction } from "@/lib/auth/permissions";

describe("leader routes", () => {
  it("matches leader profile detail pages", () => {
    const match = matchRoute("/leaders/profiles/leader-123");

    expect(match?.type).toBe("detail");
    expect(match?.params).toEqual({ id: "leader-123" });
    expect(match?.route.kind).toBe("leaders");
  });

  it("keeps the leader profile list route separate from detail route", () => {
    const route = findRoute("/leaders/profiles");

    expect(route?.detailPath).toBe("/leaders/profiles/:id");
    expect(matchRoute("/leaders/profiles")?.type).toBe("list");
  });

  it("allows profile edit only for parish admins with leader update permission", () => {
    const route = findRoute("/leaders/profiles");

    expect(
      canUseAction(
        { username: "diocese-admin", roles: ["ADMIN_DIOCESE"], permissions: ["organization.leader.update.diocese"] },
        route?.actions?.edit,
      ),
    ).toBe(false);
    expect(
      canUseAction(
        { username: "parish-admin", roles: ["ADMIN_PARISH"], permissions: ["organization.leader.update.parish"] },
        route?.actions?.edit,
      ),
    ).toBe(true);
  });
});
