import { describe, expect, it } from "vitest";
import { canEditRow, canToggleRow, canResetPasswordRow } from "@/components/common/resource/resource-row-permissions";
import type { RouteConfig } from "@/config/routes/routes";
import type { AuthUser } from "@/lib/auth/auth-store";

const route = (kind: string) => ({ kind }) as unknown as RouteConfig;
const user = (roles: string[], permissions: string[] = [], username = "u"): AuthUser => ({ username, roles, permissions }) as AuthUser;

describe("canEditRow", () => {
  it("never edits accounts, leaders or permanently revoked assignments", () => {
    const admin = user(["ADMIN_DIOCESE"]);
    expect(canEditRow(route("accounts"), {}, admin)).toBe(false);
    expect(canEditRow(route("leaders"), {}, admin)).toBe(false);
    expect(canEditRow(route("account-permissions"), { validity: "EXPIRED" }, admin)).toBe(false);
    expect(canEditRow(route("account-permissions"), { validity: "ACTIVE" }, admin)).toBe(true);
  });

  it("limits positions to the level the user holds permission for", () => {
    const row = { positionType: "DEANERY" };
    expect(canEditRow(route("positions"), row, user([], ["organization.position.update.deanery"]))).toBe(true);
    expect(canEditRow(route("positions"), row, user([], ["organization.position.update.parish"]))).toBe(false);
  });

  it("blocks system roles for non super admins and units for super admin", () => {
    expect(canEditRow(route("roles"), { isSystem: true }, user(["ADMIN_DIOCESE"]))).toBe(false);
    expect(canEditRow(route("roles"), { isSystem: true }, user(["SUPER_ADMIN"]))).toBe(true);
    expect(canEditRow(route("dioceses"), {}, user(["SUPER_ADMIN"]))).toBe(false);
    expect(canEditRow(route("dioceses"), {}, user(["ADMIN_DIOCESE"]))).toBe(true);
  });
});

describe("canToggleRow", () => {
  it("applies unit-specific rules", () => {
    expect(canToggleRow(route("dioceses"), {}, user(["SUPER_ADMIN"]))).toBe(true);
    expect(canToggleRow(route("dioceses"), {}, user(["ADMIN_DIOCESE"]))).toBe(false);
    expect(canToggleRow(route("deaneries"), {}, user(["ADMIN_DIOCESE"]))).toBe(true);
    expect(canToggleRow(route("parishes"), {}, user(["ADMIN_DEANERY"]))).toBe(true);
    expect(canToggleRow(route("parishes"), {}, user(["ADMIN_DIOCESE"]))).toBe(false);
    expect(canToggleRow(route("parishes"), {}, user(["ADMIN_DIOCESE"], ["organization.parish.toggle.diocese"]))).toBe(true);
  });

  it("does not toggle own account or a super admin account", () => {
    const me = user(["ADMIN_DIOCESE"], [], "me");
    expect(canToggleRow(route("accounts"), { username: "me" }, me)).toBe(false);
    expect(canToggleRow(route("accounts"), { username: "x", primaryRoleCode: "SUPER_ADMIN" }, me)).toBe(false);
    expect(canToggleRow(route("accounts"), { username: "x", primaryRoleCode: "ADMIN_PARISH" }, me)).toBe(true);
  });

  it("only lets executive board assignments be ended, never re-enabled", () => {
    const perm = user([], ["organization.executive_board_assignment.toggle.diocese"]);
    expect(canToggleRow(route("executive-board"), { status: true, unitType: "DIOCESE" }, perm)).toBe(true);
    expect(canToggleRow(route("executive-board"), { status: false, unitType: "DIOCESE" }, perm)).toBe(false);
  });

  it("restricts super admin to permission and account-role rows in the generic case", () => {
    expect(canToggleRow(route("permissions"), {}, user(["SUPER_ADMIN"]))).toBe(true);
    expect(canToggleRow(route("roles"), {}, user(["SUPER_ADMIN"]))).toBe(false);
    expect(canToggleRow(route("roles"), {}, user(["ADMIN_DIOCESE"]))).toBe(true);
  });
});

describe("canResetPasswordRow", () => {
  it("requires an active account that is neither own nor super admin", () => {
    const me = user(["ADMIN_DIOCESE"], [], "me");
    expect(canResetPasswordRow({ status: true, username: "x" }, me)).toBe(true);
    expect(canResetPasswordRow({ status: false, username: "x" }, me)).toBe(false);
    expect(canResetPasswordRow({ status: true, username: "me" }, me)).toBe(false);
  });
});
