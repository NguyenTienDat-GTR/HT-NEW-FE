import { describe, expect, it } from "vitest";
import { courseTypesForDioceseCourse } from "@/modules/training-courses/form-specs";

describe("courseTypesForDioceseCourse", () => {
  it("limits the course type list to diocese-level types when editing a diocese course", () => {
    const endpoint = courseTypesForDioceseCourse({ managementUnitType: "DIOCESE" });
    expect(decodeURIComponent(endpoint ?? "")).toContain(`"managementUnitType":"DIOCESE"`);
    expect(endpoint).toContain("status=true");
  });

  it("leaves the list to the account scope for deanery courses and new courses", () => {
    expect(courseTypesForDioceseCourse({ managementUnitType: "DEANERY" })).toBeUndefined();
    expect(courseTypesForDioceseCourse({})).toBeUndefined();
  });
});
