import { describe, expect, it } from "vitest";
import { resolvePreset, withResolvedRange } from "@/modules/analytics/presets";
import { defaultFilters } from "@/modules/analytics/types";

const today = new Date(2026, 9, 22); // 22/10/2026

describe("date presets", () => {
  it("resolves rolling and calendar ranges", () => {
    expect(resolvePreset("last30Days", today)).toEqual({ fromDate: "2026-09-23", toDate: "2026-10-22" });
    expect(resolvePreset("thisMonth", today)).toEqual({ fromDate: "2026-10-01", toDate: "2026-10-31" });
    expect(resolvePreset("lastMonth", today)).toEqual({ fromDate: "2026-09-01", toDate: "2026-09-30" });
    expect(resolvePreset("thisQuarter", today)).toEqual({ fromDate: "2026-10-01", toDate: "2026-12-31" });
    expect(resolvePreset("lastQuarter", today)).toEqual({ fromDate: "2026-07-01", toDate: "2026-09-30" });
    expect(resolvePreset("lastYear", today)).toEqual({ fromDate: "2025-01-01", toDate: "2025-12-31" });
  });

  it("crosses year boundaries correctly", () => {
    const january = new Date(2026, 0, 5);
    expect(resolvePreset("lastMonth", january)).toEqual({ fromDate: "2025-12-01", toDate: "2025-12-31" });
    expect(resolvePreset("lastQuarter", january)).toEqual({ fromDate: "2025-10-01", toDate: "2025-12-31" });
  });

  it("leaves the default 12-month preset empty so the backend default applies", () => {
    expect(withResolvedRange(defaultFilters, today)).toMatchObject({ fromDate: "", toDate: "" });
  });

  it("keeps custom dates untouched", () => {
    const custom = { ...defaultFilters, preset: "custom", fromDate: "2026-02-01", toDate: "2026-02-10" };
    expect(withResolvedRange(custom, today)).toBe(custom);
  });
});
