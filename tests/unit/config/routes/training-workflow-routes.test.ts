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
