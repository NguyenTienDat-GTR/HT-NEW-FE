import { describe, expect, it } from "vitest";
import { organizationFormSpecs } from "@/modules/organizations/form-specs";

describe("tên xứ đoàn và hiệp đoàn không bắt buộc", () => {
  it("form giáo hạt và giáo xứ không yêu cầu nhập", () => {
    const field = (kind: string, name: string) => organizationFormSpecs.find((spec) => spec.kind === kind)!.fields.find((item) => item.name === name)!;
    expect(field("deaneries", "associationName").required).not.toBe(true);
    expect(field("parishes", "chapterName").required).not.toBe(true);
  });

  it("bỏ trống thì không gửi trường lên BE", () => {
    const spec = organizationFormSpecs.find((item) => item.kind === "parishes")!;
    expect(spec.mapSubmit?.({ name: "Giáo xứ A", deaneryId: "d1", unitType: "PARISH", chapterName: "" }, "create")).not.toHaveProperty("chapterName");
  });
});
