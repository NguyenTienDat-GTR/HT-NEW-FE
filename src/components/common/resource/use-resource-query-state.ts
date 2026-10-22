"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { serializeBaseSearch } from "@/lib/api/search";
import type { RouteConfig } from "@/config/routes/routes";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { readStoredQuery, writeStoredQuery } from "@/lib/use-session-state";

const PERSISTENT_BASE_KEYS = ["page", "size", "search", "status", "sortBy", "sortDirection"];

export type ResourcePageSize = 10 | 20 | 50 | 100;

export function useResourceQueryState(route: RouteConfig, fixedFilters: Record<string, string> = {}, externalSearch?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  // Bộ lọc được nhớ theo từng danh sách (và từng tab nhúng): quay lại từ trang khác / modal vẫn giữ nguyên lựa chọn.
  const storageKey = `${pathname}|${urlParams.get("tab") ?? ""}`;
  const persistentKeys = useMemo(
    () => [...PERSISTENT_BASE_KEYS, ...(route.filters ?? []).map((filter) => filter.key)],
    [route.filters],
  );
  const urlString = urlParams.toString();
  const searchParams = useMemo(() => {
    const params = new URLSearchParams(urlString);
    // URL đã mang bộ lọc thì URL là nguồn đúng; URL trần (menu, đóng modal...) thì khôi phục bộ lọc đã lưu.
    if (persistentKeys.some((key) => params.has(key))) return params;
    new URLSearchParams(readStoredQuery(storageKey)).forEach((value, key) => {
      if (persistentKeys.includes(key)) params.set(key, value);
    });
    return params;
  }, [persistentKeys, storageKey, urlString]);
  const restoredFromStorage = searchParams.toString() !== urlString;
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

  const commit = useCallback(
    (next: URLSearchParams) => {
      const stored = new URLSearchParams();
      persistentKeys.forEach((key) => {
        const value = next.get(key);
        if (value !== null) stored.set(key, value);
      });
      writeStoredQuery(storageKey, stored.toString());
      router.replace(`${pathname}?${next.toString()}` as Route);
    },
    [pathname, persistentKeys, router, storageKey],
  );

  // Đưa bộ lọc khôi phục lên URL để liên kết và nút tải lại khớp với những gì đang hiển thị.
  useEffect(() => {
    if (restoredFromStorage) router.replace(`${pathname}?${searchParams.toString()}` as Route);
  }, [pathname, restoredFromStorage, router, searchParams]);

  useEffect(() => {
    if (externalSearch !== undefined || debouncedLocalSearch === urlSearch) return;

    const next = new URLSearchParams(searchParams);
    if (debouncedLocalSearch) next.set("search", debouncedLocalSearch);
    else next.delete("search");
    next.set("page", "1");
    commit(next);
  }, [commit, debouncedLocalSearch, externalSearch, searchParams, urlSearch]);

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
    commit(next);
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(Math.max(nextPage, 0) + 1));
    commit(next);
  }

  function updatePageSize(nextSize: ResourcePageSize) {
    const next = new URLSearchParams(searchParams);
    next.set("size", String(nextSize));
    next.set("page", "1");
    commit(next);
  }

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Đổi bộ lọc cha thì bỏ giá trị các bộ lọc con (giáo hạt -> giáo xứ) vì không còn thuộc lựa chọn mới.
    dependentFilterKeys(route.filters ?? [], key).forEach((child) => next.delete(child));
    next.set("page", "1");
    commit(next);
  }

  function resetFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    (route.filters ?? []).forEach((filter) => {
      if (filter.key !== "status") next.delete(filter.key);
    });
    next.set("page", "1");
    commit(next);
  }

  function sort(column: string) {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", column);
    next.set("sortDirection", sortBy === column && sortDirection === "ASC" ? "DESC" : "ASC");
    commit(next);
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
