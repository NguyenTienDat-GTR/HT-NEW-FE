import { describe, expect, it } from "vitest";
import { normalizeSubdomain, suggestSubdomain, validateSubdomain } from "@/modules/organizations/site-subdomain";

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

  it("gợi ý subdomain từ tên giáo phận: bỏ dấu, khoảng trắng, đ -> d", () => {
    expect(suggestSubdomain("Xuân Lộc")).toBe("xuanloc");
    expect(suggestSubdomain("Xuân lộc")).toBe("xuanloc");
    expect(suggestSubdomain("Phú Cường")).toBe("phucuong");
    expect(suggestSubdomain("Giáo phận Đà Lạt")).toBe("dalat");
    expect(suggestSubdomain("  Bà Rịa - Vũng Tàu ")).toBe("bariavungtau");
  });

  it("không gợi ý khi tên quá ngắn hoặc trùng nhãn dành riêng", () => {
    expect(suggestSubdomain("")).toBe("");
    expect(suggestSubdomain("An")).toBe("");
    expect(suggestSubdomain("Test")).toBe("");
  });
});
