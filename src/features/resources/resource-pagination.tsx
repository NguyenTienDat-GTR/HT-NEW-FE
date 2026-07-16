"use client";

import { Button } from "@/components/ui/button";
import type { PageResponse } from "@/lib/api/client";
import { viNumber } from "@/lib/utils";
import type { ResourcePageSize } from "./use-resource-query-state";

const pageSizes: ResourcePageSize[] = [10, 20, 50, 100];

export function ResourcePagination({
  data,
  page,
  size,
  updatePage,
  updatePageSize,
}: {
  data?: PageResponse<Record<string, unknown>>;
  page: number;
  size: ResourcePageSize;
  updatePage: (page: number) => void;
  updatePageSize: (size: ResourcePageSize) => void;
}) {
  const totalPages = Math.max(data?.totalPages ?? 1, 1);
  const currentPage = Math.min(page + 1, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-white px-4 py-3 text-sm text-muted xl:flex-row xl:items-center xl:justify-between">
      <span className="whitespace-nowrap font-medium">
        Tổng {viNumber.format(data?.totalElements ?? 0)} bản ghi, trang {currentPage}/{totalPages}
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap">Số dòng</span>
          <select
            aria-label="Số dòng mỗi trang"
            className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
            onChange={(event) => updatePageSize(Number(event.target.value) as ResourcePageSize)}
            value={size}
          >
            {pageSizes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2" role="navigation" aria-label="Chọn trang">
          <Button disabled={isFirstPage} onClick={() => updatePage(0)} size="sm" variant="outline">
            Đầu
          </Button>
          <Button disabled={isFirstPage} onClick={() => updatePage(page - 1)} size="sm" variant="outline">
            Trước
          </Button>
          {buildPageItems(currentPage, totalPages).map((item) =>
            typeof item === "number" ? (
              <Button
                aria-current={item === currentPage ? "page" : undefined}
                className="w-10 px-0"
                key={item}
                onClick={() => updatePage(item - 1)}
                size="sm"
                variant={item === currentPage ? "primary" : "outline"}
              >
                {item}
              </Button>
            ) : (
              <span className="inline-flex h-10 w-8 items-center justify-center text-muted" key={item}>
                ...
              </span>
            ),
          )}
          <Button disabled={isLastPage} onClick={() => updatePage(page + 1)} size="sm" variant="outline">
            Sau
          </Button>
          <Button disabled={isLastPage} onClick={() => updatePage(totalPages - 1)} size="sm" variant="outline">
            Cuối
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalizedPages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((left, right) => left - right);

  return normalizedPages.flatMap((page, index) => {
    const previous = normalizedPages[index - 1];
    if (!previous || page - previous === 1) return [page];
    return [`ellipsis-${previous}-${page}`, page];
  });
}
