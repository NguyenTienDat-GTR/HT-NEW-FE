import { describe, expect, it } from "vitest";
import { findRoute } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";

function canSee(path: string, permissions: string[]) {
  const route = findRoute(path);
  const user: AuthUser = {
    username: "user",
    roles: ["ADMIN_PARISH"],
    permissions,
  };
  return Boolean(route && route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix)));
}

describe("training workflow routes", () => {
  it("shows only registration route for parish participation read permission", () => {
    const permissions = ["training.participation.read.parish"];

    expect(canSee("/training/registrations", permissions)).toBe(true);
    expect(canSee("/training/approvals", permissions)).toBe(false);
    expect(canSee("/training/participations", permissions)).toBe(false);
    expect(canSee("/training/scores", permissions)).toBe(false);
  });

  it("shows participation list to deanery and diocese participation readers", () => {
    expect(canSee("/training/participations", ["training.participation.read.deanery"])).toBe(true);
    expect(canSee("/training/participations", ["training.participation.read.diocese"])).toBe(true);
  });
});

describe("training workflow menu placement", () => {
  it("removes the workflow group from the sidebar but keeps its routes resolvable", async () => {
    const { routeGroups, matchRoute } = await import("@/config/routes/routes");

    expect(routeGroups.some((group) => group.moduleName === "training-workflow")).toBe(false);
    expect(matchRoute("/training/registrations/new")?.type).toBe("create");
    expect(matchRoute("/training/participations/abc/score")?.type).toBe("score");
  });

  it("resolves a course path as a course detail page", async () => {
    const { matchRoute } = await import("@/config/routes/routes");
    const match = matchRoute("/training/courses/ABC-1");

    expect(match?.type).toBe("detail");
    expect(match?.params.id).toBe("ABC-1");
    expect(matchRoute("/training/courses/new")?.type).toBe("create");
  });
});

describe("unit filter cascading", () => {
  it("makes the parish filter depend on the deanery filter in every module", async () => {
    const { findRoute } = await import("@/config/routes/routes");

    for (const [path, deaneryKey, parishKey] of [
      ["/training/registrations", "leader.parish.deanery.id", "leader.parish.id"],
      ["/training/approvals", "leader.parish.deanery.id", "leader.parish.id"],
      ["/training/participations", "leader.parish.deanery.id", "leader.parish.id"],
      ["/training/scores", "leader.parish.deanery.id", "leader.parish.id"],
    ] as const) {
      const filters = findRoute(path)?.filters ?? [];
      expect(filters.find((filter) => filter.key === parishKey)?.dependsOn?.filterKey).toBe(deaneryKey);
    }
  });
});
