import { describe, expect, it } from "vitest";
import { metricLabel, toChartRows, toKpiList } from "./types";

describe("analytics adapters", () => {
  it("maps KPI and trend data without inventing labels from backend", () => {
    const data = {
      kpis: { totalLeaders: 10 },
      trends: [{ period: "2026-07", metrics: { totalLeaders: 10 } }],
    };

    expect(metricLabel("totalLeaders")).toBe("Huynh trưởng");
    expect(toKpiList(data)).toEqual([{ key: "totalLeaders", value: 10 }]);
    expect(toChartRows(data)).toEqual([{ period: "2026-07", totalLeaders: 10 }]);
  });
});
