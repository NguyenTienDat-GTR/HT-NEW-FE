"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { serializeBaseSearch } from "@/lib/api/search";
import type { RouteConfig } from "@/config/routes/routes";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export type ResourcePageSize = 10 | 20 | 50 | 100;

export function useResourceQueryState(route: RouteConfig, fixedFilters: Record<string, string> = {}, externalSearch?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localSearch, setSearch] = useState(searchParams.get("search") ?? "");
  // Có ô tìm kiếm chung bên ngoài (chi tiết khóa) thì dùng từ khóa đó thay cho ô tìm kiếm riêng.
  const search = externalSearch ?? localSearch;
  // Ô tìm kiếm riêng chỉ gửi request khi người dùng ngừng nhập; từ khóa bên ngoài đã được debounce ở nơi nhập.
  const debouncedLocalSearch = useDebouncedValue(localSearch);
  const requestSearch = externalSearch ?? debouncedLocalSearch;

  const page = parseUrlPage(searchParams.get("page")) - 1;
  const size = parsePageSize(searchParams.get("size"));
  const urlSearch = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortDirection = (searchParams.get("sortDirection") as "ASC" | "DESC" | null) ?? "ASC";
  const filterValues = useMemo(
    () =>
      Object.fromEntries(
        (route.filters ?? [])
          .filter((filter) => filter.key !== "status")
          .map((filter) => [filter.key, searchParams.get(filter.key) ?? ""]),
      ),
    [route.filters, searchParams],
  );

  useEffect(() => {
    if (externalSearch !== undefined || debouncedLocalSearch === urlSearch) return;

    const next = new URLSearchParams(searchParams);
    if (debouncedLocalSearch) next.set("search", debouncedLocalSearch);
    else next.delete("search");
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }, [debouncedLocalSearch, externalSearch, pathname, router, searchParams, urlSearch]);

  const queryString = useMemo(() => {
    return serializeBaseSearch({
      // Từ khóa vừa đổi mà URL chưa kịp về trang 1 thì gửi trang đầu luôn, tránh một request thừa với trang cũ.
      page: externalSearch === undefined && requestSearch !== urlSearch ? 0 : page,
      size,
      search: requestSearch,
      status: status === "all" ? undefined : status === "active",
      filters: {
        ...route.baseFilters,
        ...Object.fromEntries(
          (route.filters ?? [])
            .filter((filter) => filter.key !== "status")
            .map((filter) => [filter.key, normalizeFilterValue(filterValues[filter.key], filter.type)])
            // Bộ lọc để trống không được ghi đè bộ lọc nền của route.
            .filter(([, value]) => value !== undefined && value !== null && value !== ""),
        ),
        ...fixedFilters,
      },
      searchFields: route.searchFields,
      sortBy: sortBy ? (route.sortFields?.[sortBy] === undefined ? sortBy : (route.sortFields[sortBy] ?? undefined)) : undefined,
      sortDirection,
    }).toString();
  }, [externalSearch, filterValues, fixedFilters, page, requestSearch, route.baseFilters, route.filters, route.searchFields, route.sortFields, size, sortBy, sortDirection, status, urlSearch]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(Math.max(nextPage, 0) + 1));
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updatePageSize(nextSize: ResourcePageSize) {
    const next = new URLSearchParams(searchParams);
    next.set("size", String(nextSize));
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Đổi bộ lọc cha thì bỏ giá trị các bộ lọc con (giáo hạt -> giáo xứ) vì không còn thuộc lựa chọn mới.
    dependentFilterKeys(route.filters ?? [], key).forEach((child) => next.delete(child));
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function resetFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    (route.filters ?? []).forEach((filter) => {
      if (filter.key !== "status") next.delete(filter.key);
    });
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function sort(column: string) {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", column);
    next.set("sortDirection", sortBy === column && sortDirection === "ASC" ? "DESC" : "ASC");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  return {
    page,
    queryString,
    search,
    setSearch,
    size,
    sort,
    sortBy,
    sortDirection,
    status,
    filterValues,
    updatePage,
    updatePageSize,
    updateFilter,
    updateParam,
    resetFilters,
  };
}

function dependentFilterKeys(filters: NonNullable<RouteConfig["filters"]>, parentKey: string): string[] {
  const direct = filters.filter((filter) => filter.dependsOn?.filterKey === parentKey).map((filter) => filter.key);
  return direct.flatMap((key) => [key, ...dependentFilterKeys(filters, key)]);
}

function parseUrlPage(value: string | null) {
  const page = Number(value ?? 0);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

function parsePageSize(value: string | null): ResourcePageSize {
  const size = Number(value ?? 10);
  if (size === 20 || size === 50 || size === 100) return size;
  return 10;
}

function normalizeFilterValue(value: string | undefined, type?: "text" | "select" | "boolean") {
  if (!value) return undefined;
  if (type === "boolean") return value === "true";
  return value;
}
