import { describe, expect, it } from "vitest";
import { shortUnitName } from "@/lib/unit-name";

describe("shortUnitName", () => {
  it("drops the unit-type prefix", () => {
    expect(shortUnitName("Giáo xứ Lái Thiêu")).toBe("Lái Thiêu");
    expect(shortUnitName("giáo hạt Thủ Dầu Một")).toBe("Thủ Dầu Một");
    expect(shortUnitName("Giáo họ Bà Lụa")).toBe("Bà Lụa");
  });

  it("keeps names without a prefix and never returns empty for a real name", () => {
    expect(shortUnitName("Lái Thiêu")).toBe("Lái Thiêu");
    expect(shortUnitName("Giáo xứ")).toBe("Giáo xứ");
    expect(shortUnitName(null)).toBe("");
    expect(shortUnitName(undefined)).toBe("");
  });
});
