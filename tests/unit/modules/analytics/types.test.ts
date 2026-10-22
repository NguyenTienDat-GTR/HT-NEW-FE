import { describe, expect, it } from "vitest";
import { formatKpiValue, kpiLabel, keyLabel } from "@/modules/analytics/labels";
import { breakdownsOf, findKpi, metricNullable, metricNumber, toChartRows, type AnalyticsResponse } from "@/modules/analytics/types";

const response: AnalyticsResponse = {
  scope: "diocese",
  filters: { fromDate: "2026-01-01", toDate: "2026-03-31", timeBucket: "month", includeInactiveUnits: false },
  kpis: [{ key: "passRate", unit: "PERCENT", value: 80, numerator: 8, denominator: 10 }],
  breakdowns: [
    { type: "course", key: "c1", label: "Khóa 1", metrics: { registrations: 5, passRate: null } },
    { type: "gender", key: "NU", metrics: { count: 3 } },
  ],
};

describe("analytics adapters", () => {
  it("finds KPIs and breakdowns by key and type", () => {
    expect(findKpi(response, "passRate")?.value).toBe(80);
    expect(findKpi(response, "missing")).toBeUndefined();
    expect(breakdownsOf(response, "course")).toHaveLength(1);
  });

  it("reads metrics without turning missing values into fake zeros for nullable ones", () => {
    const course = breakdownsOf(response, "course")[0];
    expect(metricNumber(course, "registrations")).toBe(5);
    expect(metricNumber(course, "passRate")).toBe(0);
    expect(metricNullable(course, "passRate")).toBeNull();
  });

  it("aligns the previous period onto each current row by position", () => {
    const rows = toChartRows(
      [{ period: "2026-02", metrics: { registrations: 4 } }, { period: "2026-03", metrics: { registrations: 6 } }],
      [{ period: "2026-01", metrics: { registrations: 1 } }, { period: "2026-02", metrics: { registrations: 2 } }],
    );
    expect(rows[1]).toMatchObject({ period: "2026-03", registrations: 6, previousPeriod: "2026-02", "prev:registrations": 2 });
  });

  it("maps keys to Vietnamese labels, preferring entity names from data", () => {
    expect(kpiLabel("passRate")).toBe("Tỷ lệ đạt");
    expect(keyLabel("NU")).toBe("Nữ");
    expect(keyLabel("uuid-1", "Giáo hạt Phú Cường")).toBe("Giáo hạt Phú Cường");
  });

  it("formats values per unit and shows a dash when there is no data", () => {
    expect(formatKpiValue(null, "PERCENT")).toBe("—");
    expect(formatKpiValue(86.67, "PERCENT")).toBe("86,7%");
    expect(formatKpiValue(1234, "COUNT")).toBe("1.234");
  });
});
