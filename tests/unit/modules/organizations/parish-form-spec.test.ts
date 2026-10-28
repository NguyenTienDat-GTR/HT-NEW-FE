import { describe, expect, it } from "vitest";
import { organizationFormSpecs } from "@/modules/organizations/form-specs";

const spec = organizationFormSpecs.find((item) => item.kind === "parishes")!;
const parent = spec.fields.find((field) => field.name === "parentParishId")!;

describe("form giáo xứ / giáo họ / giáo điểm", () => {
  it("mặc định tạo giáo xứ và chỉ hiện ô giáo xứ cha cho giáo họ, giáo điểm", () => {
    expect(spec.getInitialValues?.(null)).toEqual({ unitType: "PARISH" });
    expect(parent.visibleWhen?.({ unitType: "PARISH" }, "create")).toBe(false);
    expect(parent.visibleWhen?.({ unitType: "GIAO_HO" }, "create")).toBe(true);
    expect(parent.requiredWhen?.({ unitType: "GIAO_DIEM" }, "create")).toBe(true);
  });

  it("chỉ liệt kê giáo xứ cha thuộc giáo hạt đã chọn", () => {
    expect(parent.buildOptionsEndpoint?.({})).toBeUndefined();
    const endpoint = parent.buildOptionsEndpoint?.({ deaneryId: "d1" }) ?? "";
    expect(decodeURIComponent(endpoint)).toContain('"deanery.id":"d1"');
    expect(decodeURIComponent(endpoint)).toContain('"unitType":"PARISH"');
  });

  it("giữ giáo xứ cha khi tạo giáo họ, bỏ khi tạo giáo xứ và khi sửa", () => {
    const base = { name: "Giáo họ B", deaneryId: "d1", parentParishId: "p1" };
    expect(spec.mapSubmit?.({ ...base, unitType: "GIAO_HO" }, "create")).toMatchObject({ unitType: "GIAO_HO", parentParishId: "p1" });
    expect(spec.mapSubmit?.({ ...base, unitType: "PARISH" }, "create")).not.toHaveProperty("parentParishId");
    const edited = spec.mapSubmit?.({ ...base, unitType: "GIAO_HO" }, "edit") ?? {};
    expect(edited).not.toHaveProperty("unitType");
    expect(edited).not.toHaveProperty("parentParishId");
    expect(edited).not.toHaveProperty("deaneryId");
  });
});
