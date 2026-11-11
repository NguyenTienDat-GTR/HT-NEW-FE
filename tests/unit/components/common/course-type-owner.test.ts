import { describe, expect, it } from "vitest";
import { courseTypeOwnerLabel } from "@/components/common/resource/resource-format";
import { canEditRow, canToggleRow } from "@/components/common/resource/resource-row-permissions";
import type { RouteConfig } from "@/config/routes/routes";

const route = { kind: "course-types" } as unknown as RouteConfig;

describe("course type owner", () => {
  it("labels where a course type comes from", () => {
    expect(courseTypeOwnerLabel({ managementUnitType: "DIOCESE", ownerUnitType: "DIOCESE" })).toBe("Giáo phận");
    expect(courseTypeOwnerLabel({ managementUnitType: "DEANERY", ownerUnitType: "DIOCESE" })).toBe("Dùng chung");
    expect(courseTypeOwnerLabel({ managementUnitType: "DEANERY", ownerUnitType: "DEANERY" })).toBe("Giáo hạt tự tạo");
  });

  it("hides edit and toggle when the backend says the row is not editable", () => {
    expect(canEditRow(route, { editable: false }, null)).toBe(false);
    expect(canToggleRow(route, { editable: false }, null)).toBe(false);
    expect(canEditRow(route, { editable: true }, null)).toBe(true);
    expect(canToggleRow(route, {}, null)).toBe(true);
  });
});
