import type { AnalyticsFilterState } from "@/modules/analytics/types";

export type DatePresetId = "last30Days" | "last90Days" | "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "last12Months" | "thisYear" | "lastYear" | "custom";

export const datePresets: { id: DatePresetId; label: string }[] = [
  { id: "last30Days", label: "30 ngày qua" },
  { id: "last90Days", label: "90 ngày qua" },
  { id: "thisMonth", label: "Tháng này" },
  { id: "lastMonth", label: "Tháng trước" },
  { id: "thisQuarter", label: "Quý này" },
  { id: "lastQuarter", label: "Quý trước" },
  { id: "last12Months", label: "12 tháng qua" },
  { id: "thisYear", label: "Năm nay" },
  { id: "lastYear", label: "Năm trước" },
];

export function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Khoảng ngày [from, to] của preset; `last12Months` trả rỗng để BE dùng mặc định (cùng key cache với prefetch phía server). */
export function resolvePreset(id: string, today = new Date()): { fromDate: string; toDate: string } {
  const year = today.getFullYear();
  const month = today.getMonth();
  const quarterStart = Math.floor(month / 3) * 3;
  switch (id) {
    case "last30Days":
      return { fromDate: isoDate(new Date(year, month, today.getDate() - 29)), toDate: isoDate(today) };
    case "last90Days":
      return { fromDate: isoDate(new Date(year, month, today.getDate() - 89)), toDate: isoDate(today) };
    case "thisMonth":
      return { fromDate: isoDate(new Date(year, month, 1)), toDate: isoDate(new Date(year, month + 1, 0)) };
    case "lastMonth":
      return { fromDate: isoDate(new Date(year, month - 1, 1)), toDate: isoDate(new Date(year, month, 0)) };
    case "thisQuarter":
      return { fromDate: isoDate(new Date(year, quarterStart, 1)), toDate: isoDate(new Date(year, quarterStart + 3, 0)) };
    case "lastQuarter":
      return { fromDate: isoDate(new Date(year, quarterStart - 3, 1)), toDate: isoDate(new Date(year, quarterStart, 0)) };
    case "thisYear":
      return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
    case "lastYear":
      return { fromDate: `${year - 1}-01-01`, toDate: `${year - 1}-12-31` };
    default:
      return { fromDate: "", toDate: "" };
  }
}

/** Áp preset vào bộ lọc; `custom` giữ nguyên ngày người dùng nhập. */
export function withResolvedRange(filters: AnalyticsFilterState, today = new Date()): AnalyticsFilterState {
  if (filters.preset === "custom") return filters;
  return { ...filters, ...resolvePreset(filters.preset, today) };
}

export function presetLabel(filters: AnalyticsFilterState) {
  if (filters.preset === "custom") return filters.fromDate || filters.toDate ? `${filters.fromDate || "…"} → ${filters.toDate || "…"}` : "Tùy chọn";
  return datePresets.find((preset) => preset.id === filters.preset)?.label ?? "12 tháng qua";
}

/** Khoảng ngày thực tế BE sẽ dùng: thiếu đầu mút thì mặc định 12 tháng gần nhất, giống AnalyticsFilterRequest.resolvedRange. */
export function effectiveRange(filters: AnalyticsFilterState, today = new Date()): { from: string; to: string } {
  const resolved = withResolvedRange(filters, today);
  const to = resolved.toDate || isoDate(today);
  const end = new Date(`${to}T00:00:00`);
  const from = resolved.fromDate || isoDate(new Date(end.getFullYear(), end.getMonth() - 11, 1));
  return { from, to };
}
