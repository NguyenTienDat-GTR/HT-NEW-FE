import { describe, expect, it } from "vitest";
import { parishOptionLabel } from "@/modules/leaders/parish-option-label";

describe("parishOptionLabel", () => {
  it("labels a parish with its unit type and deanery", () => {
    expect(parishOptionLabel({ name: "Phú Cường", unitTypeLabel: "Giáo xứ", deaneryName: "Thủ Dầu Một" })).toBe("Giáo xứ Phú Cường - Giáo hạt Thủ Dầu Một");
  });

  it("shows the parent parish for giáo họ / giáo điểm", () => {
    expect(parishOptionLabel({ name: "Bà Lụa", unitTypeLabel: "Giáo họ", parentParishName: "Phú Cường", deaneryName: "Thủ Dầu Một" })).toBe(
      "Giáo họ Bà Lụa (thuộc Giáo xứ Phú Cường) - Giáo hạt Thủ Dầu Một",
    );
  });

  it("falls back to Giáo xứ and omits the deanery when missing", () => {
    expect(parishOptionLabel({ name: "A" })).toBe("Giáo xứ A");
  });
});
