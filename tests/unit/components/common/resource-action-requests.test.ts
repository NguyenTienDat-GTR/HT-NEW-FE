import { describe, expect, it } from "vitest";
import { actionSuccessMessage, buildActionRequest, type ResourceActionContext } from "@/components/common/resource/resource-action-requests";
import type { RouteConfig } from "@/config/routes/routes";

const baseConfig = { moduleLabel: "test", moduleDescription: "test" };

function context(overrides: Partial<ResourceActionContext> = {}, kind: string = "certificates"): ResourceActionContext {
  return {
    route: { endpoint: "/certificates", kind } as unknown as RouteConfig,
    config: baseConfig,
    rows: [],
    rowById: () => undefined,
    ...overrides,
  };
}

describe("buildActionRequest", () => {
  it("builds idempotent revoke / reissue calls with the reason", () => {
    expect(buildActionRequest({ action: "revoke", id: "A B", note: "sai" }, context())).toEqual({
      path: "/certificates/A%20B/revoke",
      method: "POST",
      body: { reason: "sai" },
      idempotent: true,
    });
    expect(buildActionRequest({ action: "reissue", id: "1", note: "x" }, context()).path).toBe("/certificates/1/reissue");
  });

  it("toggles status without idempotency key", () => {
    expect(buildActionRequest({ action: "toggle", id: "7" }, context())).toEqual({
      path: "/certificates/7/toggle-status",
      method: "PATCH",
      body: { confirmationText: "Xác nhận" },
      idempotent: false,
    });
  });

  it("approves and rejects through the same decision builder, honouring module overrides", () => {
    expect(buildActionRequest({ action: "approve", id: "1" }, context())).toMatchObject({ path: "/certificates/1/approve", body: { approved: true }, idempotent: true });
    expect(buildActionRequest({ action: "reject", id: "1", note: "thiếu" }, context())).toMatchObject({ body: { approved: false, review: "thiếu" } });
    const custom = context({ config: { ...baseConfig, buildApprovePath: (_route, _rows, id, approved) => `/custom/${id}/${approved ? "yes" : "no"}`, buildApproveBody: () => ({ ok: true }) } });
    expect(buildActionRequest({ action: "reject", id: "9" }, custom)).toMatchObject({ path: "/custom/9/no", body: { ok: true } });
  });

  it("removes participants of a past course through the course endpoint", () => {
    const past = context({ coursePast: true, courseCode: "K 1" });
    expect(buildActionRequest({ action: "remove", id: "p1" }, past)).toEqual({
      path: "/training/courses/K%201/participants/p1",
      method: "DELETE",
      idempotent: false,
    });
    expect(buildActionRequest({ action: "remove", id: "p1" }, context()).path).toBe("/certificates/p1");
  });

  it("revokes a permission from the row, keyed by role or username depending on the resource", () => {
    const row = { roleCode: "R", username: "u", permissionCode: "p.read" };
    const byRole = context({ rowById: () => row }, "role-permissions");
    expect(buildActionRequest({ action: "revokePermission", id: "x" }, byRole).body).toEqual({ roleCode: "R", permissionCodes: ["p.read"] });
    const byAccount = context({ rowById: () => row }, "account-permissions");
    expect(buildActionRequest({ action: "revokePermission", id: "x" }, byAccount).body).toEqual({ username: "u", permissionCodes: ["p.read"] });
  });
});

describe("revokePermission theo đơn vị", () => {
  const roleContext = (row: Record<string, unknown>) => context({ route: { endpoint: "/system/role-permissions", kind: "role-permissions" } as unknown as RouteConfig, rowById: () => row });

  it("thu hồi dòng mặc định không gửi đơn vị", () => {
    const row = { roleCode: "ADMIN_PARISH", permissionCode: "p.read", entryType: "DEFAULT" };
    expect(buildActionRequest({ action: "revokePermission", id: "x" }, roleContext(row)).body).toEqual({ roleCode: "ADMIN_PARISH", permissionCodes: ["p.read"] });
  });

  it("thu hồi quyền cấp riêng gửi đúng đơn vị của dòng", () => {
    const base = { roleCode: "ADMIN_PARISH", permissionCode: "p.read", entryType: "UNIT_GRANT" };
    expect(buildActionRequest({ action: "revokePermission", id: "x" }, roleContext({ ...base, scopeLevel: "DIOCESE", dioceseId: "d1" })).body)
      .toEqual({ roleCode: "ADMIN_PARISH", dioceseId: "d1", permissionCodes: ["p.read"] });
    expect(buildActionRequest({ action: "revokePermission", id: "x" }, roleContext({ ...base, scopeLevel: "DEANERY", dioceseId: "d1", deaneryId: "de1" })).body)
      .toEqual({ roleCode: "ADMIN_PARISH", deaneryId: "de1", permissionCodes: ["p.read"] });
    expect(buildActionRequest({ action: "revokePermission", id: "x" }, roleContext({ ...base, scopeLevel: "PARISH", dioceseId: "d1", deaneryId: "de1", parishId: "p1" })).body)
      .toEqual({ roleCode: "ADMIN_PARISH", parishId: "p1", permissionCodes: ["p.read"] });
  });
});

describe("actionSuccessMessage", () => {
  it("uses the masked email for password resets and fixed text otherwise", () => {
    expect(actionSuccessMessage("resetPassword", { maskedEmail: "a***@x.com" })).toContain("a***@x.com");
    expect(actionSuccessMessage("resetPassword", undefined)).toContain("email đã đăng ký");
    expect(actionSuccessMessage("approve", undefined)).toBe("Duyệt thành công");
    expect(actionSuccessMessage("toggle", undefined)).toBe("Đổi trạng thái thành công");
  });
});
