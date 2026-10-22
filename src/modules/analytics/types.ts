// Hợp đồng dữ liệu của /api/analytics/*. BE chỉ trả key + số liệu; nhãn hiển thị nằm ở labels.ts.

export type KpiUnit = "COUNT" | "PERCENT" | "SCORE" | "HOURS";

export type SparkPoint = { period: string; value: number | null };

export type Kpi = {
  key: string;
  unit: KpiUnit;
  value: number | null;
  previous?: number | null;
  /** Chênh lệch tuyệt đối với kỳ trước; với tỷ lệ là điểm phần trăm. */
  delta?: number | null;
  /** % thay đổi tương đối, chỉ có khi kỳ trước khác 0 và không phải tỷ lệ. */
  deltaPct?: number | null;
  numerator?: number | null;
  denominator?: number | null;
  sparkline?: SparkPoint[] | null;
};

export type MetricValue = number | string | boolean | null;

export type Breakdown = {
  type: string;
  key: string;
  label?: string | null;
  metrics: Record<string, MetricValue>;
};

export type Trend = { period: string; metrics: Record<string, number> };

export type FunnelStep = { key: string; count: number; rateOfPrevious: number | null; rateOfFirst: number | null };

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertItem = { id?: string | null; label?: string | null; value?: number | null };
export type Alert = { key: string; severity: AlertSeverity; count: number; href?: string | null; items?: AlertItem[] | null };

export type AnalyticsFilters = {
  fromDate: string;
  toDate: string;
  compareFromDate?: string | null;
  compareToDate?: string | null;
  timeBucket: "month" | "quarter" | "year";
  groupBy?: string | null;
  includeInactiveUnits: boolean;
};

export type AnalyticsResponse = {
  scope: "all" | "diocese" | "deanery" | "parish";
  filters: AnalyticsFilters;
  kpis: Kpi[];
  breakdowns?: Breakdown[] | null;
  trends?: Trend[] | null;
  previousTrends?: Trend[] | null;
  funnel?: FunnelStep[] | null;
  alerts?: Alert[] | null;
};

export type ScopeType = "diocese" | "deanery" | "parish";
export type ScopeOption = { type: ScopeType; name: string };

export type OpenCourse = {
  courseCode: string;
  courseName: string;
  courseType?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationEndAt?: string | null;
  hoursLeft?: number | null;
  urgency: "closing" | "open";
  registeredLeaders: number;
};

export type WorkQueueItem = { key: string; href: string; count: number; severity: "none" | "normal" };

export type FilterOption = { value: string; label: string; parent?: string | null };
export type FilterOptions = {
  deaneries: FilterOption[];
  parishes: FilterOption[];
  courseTypes: FilterOption[];
  courses: FilterOption[];
  leaderLevels: FilterOption[];
};

export type RecordDataset = "leaders" | "participations" | "certificates";
export type RecordsResponse = {
  dataset: RecordDataset;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  total: number;
  page: number;
  size: number;
};

/** Trạng thái bộ lọc ở FE: chuỗi rỗng nghĩa là không lọc. */
export type AnalyticsFilterState = {
  fromDate: string;
  toDate: string;
  preset: string;
  timeBucket: "month" | "quarter" | "year";
  compare: boolean;
  deaneryId: string;
  parishId: string;
  courseType: string;
  courseCode: string;
  leaderLevel: string;
  gender: string;
  groupBy: string;
  includeInactiveUnits: boolean;
  /** Phạm vi đang xem khi tài khoản có nhiều quyền phạm vi; rỗng là phạm vi rộng nhất. */
  scope: "" | ScopeType;
};

export const defaultFilters: AnalyticsFilterState = {
  fromDate: "",
  toDate: "",
  preset: "last12Months",
  timeBucket: "month",
  compare: true,
  deaneryId: "",
  parishId: "",
  courseType: "",
  courseCode: "",
  leaderLevel: "",
  gender: "",
  groupBy: "",
  includeInactiveUnits: false,
  scope: "",
};

const QUERY_KEYS = ["fromDate", "toDate", "timeBucket", "deaneryId", "parishId", "courseType", "courseCode", "leaderLevel", "gender", "groupBy", "scope"] as const;

/**
 * Chuỗi query gửi BE. Giá trị mặc định (compare = true, includeInactiveUnits = false) không gửi để key cache/prefetch
 * của bộ lọc mặc định luôn trùng nhau; `extra` dùng cho dataset/dimension khi xem chi tiết.
 */
export function buildAnalyticsQuery(filters: AnalyticsFilterState, extra: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = filters[key];
    if (value && !(key === "timeBucket" && value === "month")) params.set(key, value);
  }
  if (!filters.compare) params.set("compare", "false");
  if (filters.includeInactiveUnits) params.set("includeInactiveUnits", "true");
  for (const [key, value] of Object.entries(extra)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}

export function findKpi(data: AnalyticsResponse | undefined, key: string) {
  return data?.kpis.find((kpi) => kpi.key === key);
}

export function toChartRows(trends: Trend[] | null | undefined, previous?: Trend[] | null) {
  return (trends ?? []).map((item, index) => {
    const row: Record<string, string | number | null> = { period: item.period, ...item.metrics };
    const before = previous?.[index];
    if (before) {
      row.previousPeriod = before.period;
      for (const [key, value] of Object.entries(before.metrics)) row[`prev:${key}`] = value;
    }
    return row;
  });
}

export function breakdownsOf(data: AnalyticsResponse | undefined, type: string) {
  return (data?.breakdowns ?? []).filter((item) => item.type === type);
}

export function metricNumber(item: Breakdown, key: string): number {
  const value = item.metrics[key];
  return typeof value === "number" ? value : 0;
}

export function metricNullable(item: Breakdown, key: string): number | null {
  const value = item.metrics[key];
  return typeof value === "number" ? value : null;
}
