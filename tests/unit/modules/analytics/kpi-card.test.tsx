import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "@/modules/analytics/components/kpi-card";
import type { Kpi } from "@/modules/analytics/types";

const sparkline = [
  { period: "T9", value: 1 },
  { period: "T10", value: 3 },
];

const countKpi: Kpi = { key: "registrations", unit: "COUNT", value: 128, previous: 100, delta: 28, deltaPct: 28, sparkline };
const rateKpi: Kpi = { key: "passRate", unit: "PERCENT", value: 87.5, previous: 80, delta: 7.5, numerator: 35, denominator: 40, sparkline };

function valueOf(container: HTMLElement) {
  return container.querySelector("p.truncate.font-bold") as HTMLElement;
}

describe("KpiCard", () => {
  it("uses the same compact 20px number size for count and rate cards", () => {
    const count = render(<KpiCard kpi={countKpi} />);
    const countValue = valueOf(count.container);
    count.unmount();
    const rate = render(<KpiCard kpi={rateKpi} />);
    const rateValue = valueOf(rate.container);

    expect(countValue.className).toContain("text-xl");
    expect(rateValue.className).toBe(countValue.className);
    expect(rateValue.className).not.toContain("text-2xl");
  });

  it("shows the percentage and the comparison on separate rows so the rate card keeps the same layout", () => {
    const { container } = render(<KpiCard kpi={rateKpi} />);

    expect(valueOf(container)).toHaveTextContent("87,5%");
    // Dòng so sánh "điểm" không nằm chung hàng với số liệu và sparkline.
    const delta = screen.getByText(/điểm/);
    expect(valueOf(container).parentElement?.contains(delta)).toBe(false);
  });
});
