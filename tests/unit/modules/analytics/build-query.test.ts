import { describe, expect, it } from "vitest";
import { buildAnalyticsQuery } from "@/modules/analytics/types";

const base = { fromDate: "", toDate: "", timeBucket: "MONTH", groupBy: "", includeInactiveUnits: false };

describe("buildAnalyticsQuery", () => {
  it("omits includeInactiveUnits by default so the backend excludes locked units", () => {
    expect(buildAnalyticsQuery(base)).toBe("timeBucket=MONTH");
  });

  it("sends includeInactiveUnits only when enabled", () => {
    const params = new URLSearchParams(buildAnalyticsQuery({ ...base, includeInactiveUnits: true, fromDate: "2026-01-01" }));
    expect(params.get("includeInactiveUnits")).toBe("true");
    expect(params.get("fromDate")).toBe("2026-01-01");
  });
});
