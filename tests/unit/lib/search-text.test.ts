import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/lib/search-text";

describe("normalizeSearchText", () => {
  it("removes Vietnamese diacritics and lowercases", () => {
    expect(normalizeSearchText("Huấn luyện Cấp 1")).toBe("huan luyen cap 1");
    expect(normalizeSearchText("Đức Mẹ Vô Nhiễm")).toBe("duc me vo nhiem");
    expect(normalizeSearchText("đường")).toBe("duong");
  });

  it("treats precomposed and decomposed text the same", () => {
    expect(normalizeSearchText("Cấp".normalize("NFD"))).toBe(normalizeSearchText("Cấp".normalize("NFC")));
  });
});
