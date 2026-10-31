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

describe("actionSuccessMessage", () => {
  it("uses the masked email for password resets and fixed text otherwise", () => {
    expect(actionSuccessMessage("resetPassword", { maskedEmail: "a***@x.com" })).toContain("a***@x.com");
    expect(actionSuccessMessage("resetPassword", undefined)).toContain("email đã đăng ký");
    expect(actionSuccessMessage("approve", undefined)).toBe("Duyệt thành công");
    expect(actionSuccessMessage("toggle", undefined)).toBe("Đổi trạng thái thành công");
  });
});
