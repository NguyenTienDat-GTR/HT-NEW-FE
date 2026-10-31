import { describe, expect, it } from "vitest";
import { normalizeSubdomain, validateSubdomain } from "@/modules/organizations/site-subdomain";

describe("site-subdomain", () => {
  it("chuẩn hóa chữ thường và bỏ khoảng trắng", () => {
    expect(normalizeSubdomain("  PhuCuong ")).toBe("phucuong");
  });

  it("chấp nhận nhãn hợp lệ", () => {
    expect(validateSubdomain("phucuong")).toBeNull();
    expect(validateSubdomain("gp-sai-gon2")).toBeNull();
    expect(validateSubdomain(" PhuCuong ")).toBeNull();
  });

  it("từ chối rỗng, quá ngắn, ký tự lạ, gạch ngang ở đầu/cuối và quá dài", () => {
    for (const bad of ["", "  ", "ab", "-abc", "abc-", "ab_c", "a.b", "phú-cường", "abc def", "a".repeat(64)]) {
      expect(validateSubdomain(bad), bad).not.toBeNull();
    }
  });

  it("từ chối nhãn dành riêng cho hệ thống", () => {
    for (const reserved of ["test", "www", "staging", "api", "mail", "admin", "TEST"]) {
      expect(validateSubdomain(reserved), reserved).toContain("dành riêng");
    }
  });
});
