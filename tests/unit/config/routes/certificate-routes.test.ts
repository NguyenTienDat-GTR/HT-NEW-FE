import { describe, expect, it } from "vitest";
import { findRoute } from "@/config/routes/routes";

describe("certificate list route", () => {
  const route = findRoute("/certificates");

  it("không còn tạo, sửa hay đổi trạng thái chứng nhận thủ công", () => {
    expect(route).toBeDefined();
    expect(route?.createPath).toBeUndefined();
    expect(route?.actions?.create).toBeUndefined();
    expect(route?.actions?.edit).toBeUndefined();
    expect(route?.actions?.toggle).toBeUndefined();
    expect(route?.columns).not.toContain("status");
  });

  it("có hành động thu hồi theo quyền training.certificate.revoke.*", () => {
    expect(route?.actions?.revoke?.permissionPrefixes).toEqual(["training.certificate.revoke."]);
  });
});
