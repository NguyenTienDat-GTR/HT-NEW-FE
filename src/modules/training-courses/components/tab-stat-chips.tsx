"use client";

import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { apiFetch, type PageResponse } from "@/lib/api/client";
import { resourceKey } from "@/lib/api/query-keys";
import { serializeBaseSearch } from "@/lib/api/search";
import { cn } from "@/lib/utils";

export type StatChip = {
  label: string;
  // Bộ lọc thêm vào bộ lọc khóa; bỏ trống = tổng số hồ sơ của tab.
  filters?: Record<string, string>;
  tone?: "neutral" | "warning" | "success" | "danger";
};

const toneClass: Record<NonNullable<StatChip["tone"]>, string> = {
  neutral: "bg-surface-2 text-text-secondary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
};

// Địa chỉ đếm số hồ sơ theo bộ lọc: chỉ cần totalElements nên xin đúng 1 dòng.
export function statChipCountUrl(endpoint: string, courseCode: string, filters: Record<string, string>) {
  return `${endpoint}?${serializeBaseSearch({ page: 0, size: 1, filters: { "course.courseCode": courseCode, ...filters } }).toString()}`;
}

// Hàng nhãn thống kê của một tab trong khóa: mỗi nhãn là tổng số dòng (totalElements) theo bộ lọc riêng, không phụ thuộc ô tìm kiếm.
// Nhãn không có bộ lọc dùng lại tổng số của tab (total) mà trang khóa đã tải để hiện trên tab, không gọi API lần nữa.
export function TabStatChips({ endpoint, courseCode, chips, total }: { endpoint: string; courseCode: string; chips: StatChip[]; total?: number }) {
  const queries = useQueries({
    queries: chips.map((chip) => ({
      queryKey: resourceKey(endpoint, "tab-stat", courseCode, chip.filters ?? null),
      enabled: Boolean(endpoint) && Boolean(chip.filters),
      queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(statChipCountUrl(endpoint, courseCode, chip.filters ?? {})),
      placeholderData: keepPreviousData,
    })),
  });

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Thống kê hồ sơ">
      {chips.map((chip, index) => (
        <span key={chip.label} className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium", toneClass[chip.tone ?? "neutral"])}>
          {chip.label}
          <strong className="text-sm font-semibold">{(chip.filters ? queries[index]?.data?.totalElements : total) ?? "–"}</strong>
        </span>
      ))}
    </div>
  );
}
