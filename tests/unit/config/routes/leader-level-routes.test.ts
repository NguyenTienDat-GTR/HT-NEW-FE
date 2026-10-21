import { describe, expect, it } from "vitest";
import { findRoute } from "@/config/routes/routes";
import { canSeeRoute } from "@/modules/workspace/components/app-shell";
import type { AuthUser } from "@/lib/auth/auth-store";

describe("leader level route", () => {
  const route = findRoute("/system/leader-levels");
  const superAdmin = (permissions: string[]): AuthUser => ({ username: "super", roles: ["SUPER_ADMIN"], permissions });

  it("được khai báo trong menu Hệ thống và dùng màn hình quản lý cấp độ", () => {
    expect(route?.kind).toBe("leader-levels");
    expect(route?.title).toBe("Cấp độ huynh trưởng");
  });

  it("chỉ tài khoản có quyền đọc cấp độ (admin giáo phận) mới thấy menu; super admin không có thì không thấy", () => {
    const adminDiocese: AuthUser = { username: "admin", roles: ["ADMIN_DIOCESE"], permissions: ["system.leader_level.read.diocese"] };
    expect(canSeeRoute(route!, adminDiocese)).toBe(true);
    expect(canSeeRoute(route!, superAdmin(["system.role.read.all"]))).toBe(false);
  });
});
