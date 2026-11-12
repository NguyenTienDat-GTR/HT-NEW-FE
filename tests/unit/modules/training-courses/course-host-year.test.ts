import { describe, expect, it } from "vitest";
import { applyDefaultsFromValues } from "@/components/form/resource-form/types";
import { hostYearFromStartDate, hostYearRangeError, trainingFormSpecs } from "@/modules/training-courses/form-specs";

const courseSpec = trainingFormSpecs.find((spec) => spec.kind === "courses")!;
const hostYearField = courseSpec.fields.find((field) => field.name === "hostYear")!;

describe("hostYearFromStartDate", () => {
  it("takes the year of the start date", () => {
    expect(hostYearFromStartDate("2026-12-31")).toBe(2026);
    expect(hostYearFromStartDate("2027-01-01")).toBe(2027);
  });

  it("has no default until a full date is chosen", () => {
    expect(hostYearFromStartDate(undefined)).toBeUndefined();
    expect(hostYearFromStartDate("")).toBeUndefined();
    expect(hostYearFromStartDate("2026")).toBeUndefined();
  });
});

describe("hostYearRangeError", () => {
  it("accepts an empty value (required rule handles it) and years in range", () => {
    expect(hostYearRangeError("")).toBeUndefined();
    expect(hostYearRangeError(undefined)).toBeUndefined();
    expect(hostYearRangeError(2026)).toBeUndefined();
    expect(hostYearRangeError("2200")).toBeUndefined();
  });

  it("rejects non-integers and years out of range", () => {
    expect(hostYearRangeError(2026.5)).toContain("số nguyên");
    expect(hostYearRangeError(1899)).toContain("1900");
    expect(hostYearRangeError(2201)).toContain("2200");
  });
});

describe("course form host year field", () => {
  it("sits in the organizing-time section next to the start and end dates", () => {
    const names = courseSpec.fields.filter((field) => field.section === "Thời gian tổ chức").map((field) => field.name);
    expect(names).toEqual(["startDate", "endDate", "hostYear"]);
    expect(courseSpec.fields.some((field) => field.section === "Thời gian")).toBe(false);
  });

  it("is required when creating but not when editing a course that has no year yet", () => {
    expect(hostYearField.requiredWhen?.({}, "create")).toBe(true);
    expect(hostYearField.requiredWhen?.({}, "edit")).toBe(false);
  });

  it("defaults to the start date year until the user types a year", () => {
    const withStart = { startDate: "2026-09-01" };
    expect(applyDefaultsFromValues(courseSpec.fields, withStart, {}).hostYear).toBe(2026);

    // Đổi ngày bắt đầu sang năm khác thì năm mặc định đổi theo.
    expect(applyDefaultsFromValues(courseSpec.fields, { startDate: "2027-02-01" }, {}).hostYear).toBe(2027);

    // Người dùng đã nhập năm khác (hoặc xóa trắng) thì không bị ghi đè khi đổi ngày bắt đầu.
    expect(applyDefaultsFromValues(courseSpec.fields, { startDate: "2027-02-01", hostYear: 2025 }, { hostYear: 2025 }).hostYear).toBe(2025);
    expect(applyDefaultsFromValues(courseSpec.fields, { startDate: "2027-02-01", hostYear: "" }, { hostYear: "" }).hostYear).toBe("");
  });

  it("leaves the year empty when no start date is chosen", () => {
    const result = applyDefaultsFromValues(courseSpec.fields, {}, {});
    expect(result.hostYear).toBeUndefined();
  });

  it("does not change the input object", () => {
    const current = { startDate: "2026-09-01" };
    applyDefaultsFromValues(courseSpec.fields, current, {});
    expect(current).toEqual({ startDate: "2026-09-01" });
  });
});
