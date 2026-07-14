export type AnalyticsMetric = {
  key: string;
  value: number;
  delta?: number;
};

export type AnalyticsBucket = {
  type: string;
  key: string;
  metrics: Record<string, number>;
};

export type AnalyticsTrend = {
  period: string;
  metrics: Record<string, number>;
};

export type AnalyticsResponse = {
  scope?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  kpis?: Record<string, number>;
  breakdowns?: AnalyticsBucket[];
  trends?: AnalyticsTrend[];
  comparisons?: AnalyticsTrend[];
};

export function metricLabel(key: string) {
  const labels: Record<string, string> = {
    totalDioceses: "Giáo phận",
    totalDeaneries: "Giáo hạt",
    totalParishes: "Giáo xứ",
    totalLeaders: "Huynh trưởng",
    activeLeaders: "Đang hoạt động",
    inactiveLeaders: "Tạm ngưng",
    totalCourses: "Khóa học",
    registrations: "Đăng ký",
    completed: "Hoàn thành",
    passed: "Đạt",
    totalCertificates: "Chứng chỉ",
    approved: "Đã duyệt",
    pending: "Chờ duyệt",
    rejected: "Từ chối",
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").trim();
}

export function toKpiList(data?: AnalyticsResponse): AnalyticsMetric[] {
  return Object.entries(data?.kpis ?? {}).map(([key, value]) => ({ key, value: Number(value) || 0 }));
}

export function toChartRows(data?: AnalyticsResponse) {
  const trends = data?.trends?.length ? data.trends : data?.comparisons;
  return (trends ?? []).map((item) => ({ period: item.period, ...item.metrics }));
}
