"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border bg-white px-3 py-2.5 text-xs text-muted sm:px-5 sm:py-4 sm:text-[13px]">
      <span className="whitespace-nowrap font-medium">
        Tổng {viNumber.format(data?.totalElements ?? 0)} bản ghi, trang {currentPage}/{totalPages}
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <label className="flex items-center gap-1.5">
          <span className="hidden whitespace-nowrap sm:inline">Số dòng</span>
          <select
            aria-label="Số dòng mỗi trang"
            className="h-9 rounded-lg border border-input bg-white px-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] sm:px-3"
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
        {/* Điện thoại / tablet chỉ giữ Trước – Sau gọn; "Đầu", "Cuối" và dãy số trang chỉ hiện từ màn hình lớn. */}
        <div className="flex items-center gap-1.5 sm:gap-2" role="navigation" aria-label="Chọn trang">
          <Button className="hidden lg:inline-flex" disabled={isFirstPage} onClick={() => updatePage(0)} size="sm" variant="outline">
            Đầu
          </Button>
          <Button aria-label="Trang trước" className="px-2.5 sm:px-3" disabled={isFirstPage} onClick={() => updatePage(page - 1)} size="sm" variant="outline">
            <CaretLeft aria-hidden className="lg:hidden" size={14} />
            <span className="hidden sm:inline lg:inline">Trước</span>
          </Button>
          <span className="hidden items-center gap-2 lg:flex">
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
          </span>
          <Button aria-label="Trang sau" className="px-2.5 sm:px-3" disabled={isLastPage} onClick={() => updatePage(page + 1)} size="sm" variant="outline">
            <span className="hidden sm:inline lg:inline">Sau</span>
            <CaretRight aria-hidden className="lg:hidden" size={14} />
          </Button>
          <Button className="hidden lg:inline-flex" disabled={isLastPage} onClick={() => updatePage(totalPages - 1)} size="sm" variant="outline">
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
