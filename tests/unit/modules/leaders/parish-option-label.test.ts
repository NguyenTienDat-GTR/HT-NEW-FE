import { describe, expect, it } from "vitest";
import { parishOptionLabel } from "@/modules/leaders/parish-option-label";

describe("parishOptionLabel", () => {
  it("shows only the name for a parish", () => {
    expect(parishOptionLabel({ name: "Phú Cường", unitTypeLabel: "Giáo xứ", deaneryName: "Thủ Dầu Một" })).toBe("Phú Cường");
  });

  it("adds the unit label and parent parish for giáo họ / giáo điểm", () => {
    expect(parishOptionLabel({ name: "Bà Lụa", unitTypeLabel: "Giáo họ", parentParishName: "Phú Cường" })).toBe("Giáo họ Bà Lụa - Phú Cường");
    expect(parishOptionLabel({ name: "Suối Giữa", unitTypeLabel: "Giáo điểm", parentParishName: "Phú Cường" })).toBe("Giáo điểm Suối Giữa - Phú Cường");
    // Tên đã có nhãn thì không lặp lại.
    expect(parishOptionLabel({ name: "Giáo họ Hiệp An", unitTypeLabel: "Giáo họ", parentParishName: "Giáo xứ Chánh Tòa" })).toBe("Giáo họ Hiệp An - Giáo xứ Chánh Tòa");
  });
});
