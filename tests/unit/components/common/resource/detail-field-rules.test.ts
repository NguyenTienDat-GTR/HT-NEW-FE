import { describe, expect, it } from "vitest";
import { detailLabel, shouldRenderKey } from "@/components/common/resource/detail-field-rules";
import { DETAIL_SECTIONS_BY_KIND } from "@/components/common/resource/detail-kind-sections";
import type { RouteConfig } from "@/config/routes/routes";

const route = (kind: string) => ({ kind }) as unknown as RouteConfig;

describe("detailLabel", () => {
  it("uses kind-specific labels before the shared column labels", () => {
    expect(detailLabel(route("accounts"), "primaryRoleName")).toBe("Vai trò chính");
    expect(detailLabel(route("courses"), "courseTypeName")).toBe("Loại khóa");
    expect(detailLabel(route("dioceses"), "someUnknownKey")).toBe("someUnknownKey");
  });
});

describe("shouldRenderKey", () => {
  it("skips missing keys unless they are audit keys", () => {
    expect(shouldRenderKey(route("dioceses"), {}, "name")).toBe(false);
    expect(shouldRenderKey(route("dioceses"), {}, "createdAt")).toBe(true);
  });

  it("hides technical account fields and empty optional ones", () => {
    const row = { leaderId: "1", email: "", secondaryRoleNames: [], username: "u" };
    expect(shouldRenderKey(route("accounts"), row, "leaderId")).toBe(false);
    expect(shouldRenderKey(route("accounts"), row, "email")).toBe(false);
    expect(shouldRenderKey(route("accounts"), row, "secondaryRoleNames")).toBe(false);
    expect(shouldRenderKey(route("accounts"), row, "username")).toBe(true);
    expect(shouldRenderKey(route("accounts"), { email: "a@b.c" }, "email")).toBe(true);
  });

  it("hides ids when a display name exists and the conditions blob always", () => {
    expect(shouldRenderKey(route("leaders"), { parishId: "p", parishName: "GX" }, "parishId")).toBe(false);
    expect(shouldRenderKey(route("leaders"), { parishId: "p" }, "parishId")).toBe(true);
    expect(shouldRenderKey(route("roles"), { conditions: "x" }, "conditions")).toBe(false);
  });

  it("hides permission assignment codes that already have names", () => {
    const row = { id: "1", roleCode: "R", roleName: "Vai trò", permissionCode: "p", permissionName: "Quyền" };
    expect(shouldRenderKey(route("role-permissions"), row, "id")).toBe(false);
    expect(shouldRenderKey(route("account-permissions"), row, "roleCode")).toBe(false);
    expect(shouldRenderKey(route("role-permissions"), { ...row, permissionName: undefined }, "permissionCode")).toBe(true);
  });
});

describe("DETAIL_SECTIONS_BY_KIND", () => {
  it("covers the kinds that render sectioned details", () => {
    for (const kind of ["positions", "participations", "course-types", "executive-board"] as const) {
      expect(DETAIL_SECTIONS_BY_KIND[kind]?.length).toBeGreaterThan(0);
    }
    expect(DETAIL_SECTIONS_BY_KIND.leaders).toBeUndefined();
  });
});
