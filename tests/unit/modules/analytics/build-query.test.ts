import { describe, expect, it } from "vitest";
import { buildAnalyticsQuery, defaultFilters } from "@/modules/analytics/types";

describe("buildAnalyticsQuery", () => {
  it("sends nothing for default filters so server prefetch and client share one cache key", () => {
    expect(buildAnalyticsQuery(defaultFilters)).toBe("");
  });

  it("sends only the filters that were actually set", () => {
    const query = new URLSearchParams(
      buildAnalyticsQuery({ ...defaultFilters, fromDate: "2026-01-01", toDate: "2026-03-31", timeBucket: "quarter", deaneryId: "d1", courseType: "T1", compare: false, includeInactiveUnits: true }),
    );
    expect(Object.fromEntries(query)).toEqual({ fromDate: "2026-01-01", toDate: "2026-03-31", timeBucket: "quarter", deaneryId: "d1", courseType: "T1", compare: "false", includeInactiveUnits: "true" });
  });

  it("appends drill-down parameters and skips empty ones", () => {
    const query = new URLSearchParams(buildAnalyticsQuery(defaultFilters, { dataset: "leaders", dimension: "gender", value: "NU", page: 0, size: 15, empty: "" }));
    expect(Object.fromEntries(query)).toEqual({ dataset: "leaders", dimension: "gender", value: "NU", page: "0", size: "15" });
  });
});
