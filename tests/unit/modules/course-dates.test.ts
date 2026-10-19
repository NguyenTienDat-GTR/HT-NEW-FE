import { describe, expect, it } from "vitest";
import { isCourseWithinDates } from "@/modules/training-courses/registration-state";

describe("isCourseWithinDates", () => {
  const now = new Date("2026-10-20T03:00:00Z"); // 10:00 giờ Việt Nam ngày 2026-10-20

  it("is open on the start day and the end day", () => {
    expect(isCourseWithinDates({ startDate: "2026-10-20", endDate: "2026-10-22" }, now)).toBe(true);
    expect(isCourseWithinDates({ startDate: "2026-10-18", endDate: "2026-10-20" }, now)).toBe(true);
  });

  it("is closed before the start and after the end", () => {
    expect(isCourseWithinDates({ startDate: "2026-10-21", endDate: "2026-10-22" }, now)).toBe(false);
    expect(isCourseWithinDates({ startDate: "2026-10-10", endDate: "2026-10-19" }, now)).toBe(false);
    expect(isCourseWithinDates({ endDate: "2026-10-30" }, now)).toBe(false);
  });

  it("uses Vietnam time near midnight UTC", () => {
    const lateUtc = new Date("2026-10-19T20:30:00Z"); // 03:30 ngày 2026-10-20 giờ Việt Nam
    expect(isCourseWithinDates({ startDate: "2026-10-20", endDate: "2026-10-20" }, lateUtc)).toBe(true);
  });
});
