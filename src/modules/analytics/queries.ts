"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "@/lib/api/client";
import { withResolvedRange } from "@/modules/analytics/presets";
import { buildAnalyticsQuery, type AnalyticsFilterState, type AnalyticsResponse, type FilterOptions, type OpenCourse, type RecordDataset, type RecordsResponse, type ScopeOption, type WorkQueueItem } from "@/modules/analytics/types";

export type AnalyticsEndpoint = "overview" | "organization" | "leaders" | "courses" | "certificates";

export function analyticsPath(endpoint: AnalyticsEndpoint, query: string) {
  return `/analytics/${endpoint}${query ? `?${query}` : ""}`;
}

/** Khóa/đường dẫn dùng chung cho client và prefetch phía server: bộ lọc mặc định sinh query rỗng nên hai phía luôn trùng khóa. */
export function overviewQuery(query = "") {
  return { key: ["analytics", "overview", query] as const, path: analyticsPath("overview", query) };
}

/** Chuỗi query của bộ lọc đã được quy ra ngày cụ thể; ổn định giữa các lần render nên không refetch thừa. */
export function useResolvedQuery(filters: AnalyticsFilterState) {
  return useMemo(() => buildAnalyticsQuery(withResolvedRange(filters)), [filters]);
}

/** Giữ dữ liệu cũ trong lúc tải bộ lọc mới: biểu đồ mờ đi thay vì nhảy về khung trống. */
export function useAnalytics(endpoint: AnalyticsEndpoint, filters: AnalyticsFilterState, enabled = true) {
  const query = useResolvedQuery(filters);
  return useQuery({
    queryKey: endpoint === "overview" ? overviewQuery(query).key : ["analytics", endpoint, query],
    queryFn: () => apiFetch<AnalyticsResponse>(analyticsPath(endpoint, query)),
    // Chỉ giữ dữ liệu cũ khi đổi bộ lọc của cùng một nhóm; sang nhóm khác (tab khác) thì cấu trúc dữ liệu khác nên không dùng lại.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === endpoint ? previous : undefined),
    staleTime: 60_000,
    enabled,
  });
}

/** Các phạm vi tài khoản được xem; từ hai phạm vi trở lên thì FE hiện bộ chọn phạm vi. */
export function useScopes(enabled = true) {
  return useQuery({ queryKey: ["analytics", "scopes"], queryFn: () => apiFetch<ScopeOption[]>("/analytics/scopes"), staleTime: 10 * 60_000, enabled });
}

export function useFilterOptions(scope: string, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "filter-options", scope],
    queryFn: () => apiFetch<FilterOptions>(`/analytics/filter-options${scope ? `?scope=${scope}` : ""}`),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Khóa đang mở đăng ký của phạm vi đang xem; khóa sắp hết hạn đứng đầu. */
export function useOpenCourses(scope: string, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "open-courses", scope],
    queryFn: () => apiFetch<OpenCourse[]>(`/analytics/open-courses${scope ? `?scope=${scope}` : ""}`),
    staleTime: 60_000,
    enabled,
  });
}

export function workQueueQuery(scope: string) {
  return { key: scope ? (["analytics", "work-queue", scope] as const) : (["analytics", "work-queue"] as const), path: `/analytics/work-queue${scope ? `?scope=${scope}` : ""}` };
}

export function useWorkQueue(scope: string, enabled = true) {
  const query = workQueueQuery(scope);
  return useQuery({ queryKey: query.key, queryFn: () => apiFetch<WorkQueueItem[]>(query.path), enabled });
}

export type DrillTarget = { dataset: RecordDataset; dimension?: string; value?: string; title: string };

export function recordsQuery(filters: AnalyticsFilterState, target: DrillTarget, page: number, size: number) {
  return buildAnalyticsQuery(withResolvedRange(filters), { dataset: target.dataset, dimension: target.dimension, value: target.value, page, size });
}

export function useRecords(filters: AnalyticsFilterState, target: DrillTarget | null, page: number, size = 15) {
  return useQuery({
    queryKey: ["analytics", "records", target?.dataset, target?.dimension, target?.value, page, size, buildAnalyticsQuery(withResolvedRange(filters))],
    queryFn: () => apiFetch<RecordsResponse>(`/analytics/records?${recordsQuery(filters, target as DrillTarget, page, size)}`),
    enabled: target !== null,
    placeholderData: keepPreviousData,
  });
}

export function exportPath(filters: AnalyticsFilterState, target: DrillTarget) {
  return `/analytics/records/export?${buildAnalyticsQuery(withResolvedRange(filters), { dataset: target.dataset, dimension: target.dimension, value: target.value })}`;
}
