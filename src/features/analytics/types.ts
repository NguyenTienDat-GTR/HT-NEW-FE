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
    activeLeaders: "Đang hoạt động",
    approved: "Đã duyệt",
    averageApprovalHours: "Giờ duyệt TB",
    averageScore: "Điểm TB",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
    conversionRate: "Tỷ lệ chuyển đổi",
    exceptionApproved: "Duyệt ngoại lệ",
    inactiveLeaders: "Tạm ngưng",
    passed: "Đạt",
    pending: "Chờ duyệt",
    pendingApproval: "Chờ duyệt",
    registrations: "Đăng ký",
    rejected: "Từ chối",
    systemSuggested: "Hệ thống gợi ý",
    totalCertificates: "Chứng nhận",
    totalCourses: "Khóa học",
    totalDeaneries: "Giáo hạt",
    totalDioceses: "Giáo phận",
    totalLeaders: "Huynh trưởng",
    totalParishes: "Giáo xứ",
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
